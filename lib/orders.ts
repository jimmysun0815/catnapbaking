import { serviceClient } from "./supabase";
import { effectivePrice } from "./data";
import { sendReceipt } from "./email";
import type { Batch, Variant } from "./types";

/**
 * 订单状态机。模拟支付和以后的 Stripe webhook 都调这里，
 * 换成真支付时只要改调用方，状态流转逻辑一行不用动。
 */

/** 名额锁定时长。接入 Stripe 后与 Checkout Session 的 expires_at 保持一致 */
export const HOLD_MINUTES = 30;

export type LineInput = { variantId: string; quantity: number; flavourId: string | null };

export function newOrderNo(): string {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `CN-${ym}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export type Contact = { name: string; phone: string; email: string; giftMessage?: string | null };

/** 校验批次、产能、时段，全部通过才建单。返回不可下单的原因 */
export function validateOrder(
  batch: Batch | null, batchId: string, slotId: string, boxes: number
): { ok: true } | { ok: false; error: string; status: number; remaining?: number } {
  if (!batch || batch.id !== batchId || batch.status !== "open") {
    return { ok: false, error: "batch not open", status: 409 };
  }
  if (new Date(batch.closes_at).getTime() < Date.now()) {
    return { ok: false, error: "ordering closed", status: 409 };
  }
  const remaining = batch.capacity_boxes - batch.boxes_taken;
  if (boxes > remaining) {
    return { ok: false, error: "not enough capacity", status: 409, remaining };
  }
  const slot = batch.slots.find((s) => s.id === slotId);
  if (!slot || slot.orders_taken >= slot.max_orders) {
    return { ok: false, error: "slot unavailable", status: 409 };
  }
  return { ok: true };
}

/** 建一条 pending 订单，占住名额。返回订单号与总额（分） */
export async function createPendingOrder(args: {
  batch: Batch;
  slotId: string;
  lines: { variant: Variant; quantity: number; flavourId: string | null }[];
  contact: Contact;
  profileId?: string | null;
  channel?: "web" | "wechat" | "b2b" | "platform";
}): Promise<{ orderNo: string; orderId: string | null; subtotal: number; expiresAt: Date }> {
  const { batch, slotId, lines, contact, profileId = null, channel = "web" } = args;

  // 单价永远由服务端算，不信任浏览器传来的金额
  const subtotal = lines.reduce((sum, l) => sum + effectivePrice(batch, l.variant) * l.quantity, 0);
  const orderNo = newOrderNo();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

  const db = serviceClient();
  if (!db) return { orderNo, orderId: null, subtotal, expiresAt };

  const { data, error } = await db.from("orders").insert({
    order_no: orderNo,
    batch_id: batch.id,
    slot_id: slotId,
    profile_id: profileId,
    contact_name: contact.name,
    contact_phone: contact.phone,
    contact_email: contact.email,
    gift_message: contact.giftMessage ?? null,
    status: "pending",
    channel,
    subtotal_cents: subtotal,
    total_cents: subtotal,
    expires_at: expiresAt.toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: itemErr } = await db.from("order_items").insert(
    lines.map((l) => ({
      order_id: data.id,
      variant_id: l.variant.id,
      flavour_id: l.flavourId,
      quantity: l.quantity,
      unit_price_cents: effectivePrice(batch, l.variant),   // 价格快照
      variant_name_zh: l.variant.name_zh,
      variant_name_en: l.variant.name_en,
      cookie_count: l.variant.cookie_count,
    }))
  );
  if (itemErr) throw new Error(itemErr.message);

  return { orderNo, orderId: data.id, subtotal, expiresAt };
}

/** 幂等闸门：同一个支付事件只处理一次 */
async function claimEvent(id: string, type: string): Promise<boolean> {
  const db = serviceClient();
  if (!db) return true;
  const { error } = await db.from("payment_events").insert({ id, type });
  if (!error) return true;
  if (error.code === "23505") return false;   // 已处理过
  throw new Error(error.message);
}

/** 付款成功。只把仍在 pending 的订单推到 paid，避免覆盖已处理的单 */
export async function markOrderPaid(args: {
  orderNo: string;
  method: string;
  eventId: string;
  paymentRef?: string | null;
  totalCents?: number | null;
  contact?: Partial<Contact>;
}): Promise<{ ok: boolean; alreadyDone?: boolean }> {
  const { orderNo, method, eventId, paymentRef = null, totalCents = null, contact } = args;

  if (!(await claimEvent(eventId, "payment.succeeded"))) return { ok: true, alreadyDone: true };

  const db = serviceClient();
  if (!db) return { ok: true };

  const patch: Record<string, unknown> = {
    status: "paid",
    paid_at: new Date().toISOString(),
    payment_method: method,
    payment_ref: paymentRef,
    expires_at: null,          // 已付款，不再受锁定过期影响
  };
  if (totalCents != null) patch.total_cents = totalCents;
  if (contact?.name) patch.contact_name = contact.name;
  if (contact?.phone) patch.contact_phone = contact.phone;
  if (contact?.email) patch.contact_email = contact.email;

  const { data, error } = await db.from("orders")
    .update(patch).eq("order_no", orderNo).eq("status", "pending").select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) return { ok: true, alreadyDone: true };

  await sendReceipt(data[0].id).catch((e) => console.error("[receipt] failed", e));
  return { ok: true };
}

/** 付款失败或超时：释放名额 */
export async function releaseOrderHold(
  orderNo: string, status: "expired" | "cancelled" = "expired"
): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  const { error } = await db.from("orders")
    .update({ status, expires_at: null })
    .eq("order_no", orderNo).eq("status", "pending");   // 只动仍在 pending 的
  if (error) throw new Error(error.message);
}

export async function markOrderRefunded(paymentRef: string): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  await db.from("orders").update({ status: "refunded" }).eq("payment_ref", paymentRef);
}

/** 按订单号取单，供支付页和成功页用 */
export async function getOrderByNo(orderNo: string) {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db.from("orders")
    .select("*, order_items(*), batches(*), pickup_slots(*)")
    .eq("order_no", orderNo).maybeSingle();
  return data;
}
