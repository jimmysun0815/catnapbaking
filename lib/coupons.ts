import { serviceClient } from "./supabase";

/**
 * 优惠券。
 *
 * 校验和核销都走数据库函数（coupon_preview / coupon_redeem），不在 Node 里判断：
 *   - 过期用数据库的 now()。两处时钟会漂移，只认一处才不会出现
 *     「前端说能用、写库时又失败」
 *   - 核销时对券行加锁，并发下单抢最后一张名额不会超发
 *   - 每单一券由 coupon_redemptions 的 unique(order_id) 兜住
 */

export type CouponReason =
  | "ok" | "not_found" | "inactive" | "not_started"
  | "expired" | "used_up" | "below_min" | "order_already_has_coupon"
  | "unavailable";

export type CouponResult = {
  ok: boolean;
  reason: CouponReason;
  couponId: string | null;
  discountCents: number;
};

/** 给顾客看的说法。不暴露「这张券存在但停用了」这类内部状态差别 */
export const COUPON_MESSAGE: Record<CouponReason, string> = {
  ok: "已应用",
  not_found: "优惠码无效",
  inactive: "优惠码无效",
  not_started: "这张券还没到可用时间",
  expired: "优惠码已过期",
  used_up: "优惠码已达使用上限",
  below_min: "订单金额未达到该优惠码的使用门槛",
  order_already_has_coupon: "每单只能使用一张优惠码",
  unavailable: "暂时无法校验优惠码，请稍后再试",
};

type RpcRow = { ok: boolean; reason: string; coupon_id: string | null; discount_cents: number };

function toResult(row: RpcRow | undefined): CouponResult {
  if (!row) return { ok: false, reason: "unavailable", couponId: null, discountCents: 0 };
  return {
    ok: row.ok,
    reason: row.reason as CouponReason,
    couponId: row.coupon_id,
    discountCents: row.discount_cents ?? 0,
  };
}

/** 只读校验，下单页实时提示用 */
export async function previewCoupon(code: string, subtotalCents: number): Promise<CouponResult> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "unavailable", couponId: null, discountCents: 0 };

  const { data, error } = await db.rpc("coupon_preview", {
    p_code: code, p_subtotal_cents: subtotalCents,
  });
  if (error) return { ok: false, reason: "unavailable", couponId: null, discountCents: 0 };
  return toResult((data as RpcRow[])?.[0]);
}

/** 核销。会写核销记录、加计数、并把订单的 discount_cents 和 total_cents 改好 */
export async function redeemCoupon(
  code: string, orderId: string, subtotalCents: number
): Promise<CouponResult> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "unavailable", couponId: null, discountCents: 0 };

  const { data, error } = await db.rpc("coupon_redeem", {
    p_code: code, p_order_id: orderId, p_subtotal_cents: subtotalCents,
  });
  if (error) return { ok: false, reason: "unavailable", couponId: null, discountCents: 0 };
  return toResult((data as RpcRow[])?.[0]);
}

/** 生成券码。去掉容易看错的 0/O、1/I/L */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateCode(prefix = "", length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return (prefix ? `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, "")}-` : "") + out;
}
