import { serviceClient, isConfigured } from "./supabase";
import { BATCHES, FLAVOURS, ORDERS, PRODUCTS } from "./seed";
import type { Batch, Flavour, Order, Product, Variant } from "./types";

/**
 * 数据访问层。配了 Supabase 就走数据库，否则走演示数据。
 * 页面只调这里，切换数据源不用改页面。
 */

export const usingDemoData = !isConfigured;

export async function getProducts(): Promise<Product[]> {
  const db = serviceClient();
  if (!db) return PRODUCTS;

  const { data: products } = await db
    .from("products").select("*").eq("active", true).order("sort_order");
  const { data: variants } = await db
    .from("variants").select("*").eq("active", true).order("sort_order");
  if (!products) return PRODUCTS;

  return products.map((p) => ({
    ...p,
    variants: (variants ?? []).filter((v) => v.product_id === p.id) as Variant[],
  })) as Product[];
}

export async function getFlavours(): Promise<Flavour[]> {
  const db = serviceClient();
  if (!db) return FLAVOURS;
  const { data } = await db
    .from("flavours").select("*").eq("active", true).order("sort_order");
  return (data as Flavour[]) ?? FLAVOURS;
}

/** 当前开放的批次；没有开放批次时返回 null */
export async function getCurrentBatch(): Promise<Batch | null> {
  const db = serviceClient();
  if (!db) return BATCHES.find((b) => b.status === "open") ?? null;

  const { data: batch } = await db
    .from("batches").select("*").eq("status", "open")
    .order("opens_at", { ascending: false }).limit(1).maybeSingle();
  if (!batch) return null;

  const [{ data: slots }, { data: usage }, { data: bf }, { data: bp }] = await Promise.all([
    db.from("pickup_slots").select("*").eq("batch_id", batch.id).order("starts_at"),
    db.from("batch_usage").select("*").eq("batch_id", batch.id).maybeSingle(),
    db.from("batch_flavours").select("flavour_id").eq("batch_id", batch.id),
    db.from("batch_prices").select("variant_id, price_cents").eq("batch_id", batch.id),
  ]);

  // 每个时段已占用的订单数
  const { data: slotCounts } = await db
    .from("orders").select("slot_id").eq("batch_id", batch.id)
    .in("status", ["paid", "packed", "picked_up", "no_show"]);

  const taken = new Map<string, number>();
  for (const row of slotCounts ?? []) {
    if (row.slot_id) taken.set(row.slot_id, (taken.get(row.slot_id) ?? 0) + 1);
  }

  return {
    ...batch,
    boxes_taken: usage?.boxes_taken ?? 0,
    slots: (slots ?? []).map((s) => ({ ...s, orders_taken: taken.get(s.id) ?? 0 })),
    flavour_ids: (bf ?? []).map((r) => r.flavour_id),
    prices: Object.fromEntries((bp ?? []).map((r) => [r.variant_id, r.price_cents])),
  } as Batch;
}

/** 取有效价格：批次专属价优先，否则用规格常规价 */
export function effectivePrice(batch: Batch | null, variant: Variant): number {
  return batch?.prices?.[variant.id] ?? variant.price_cents;
}

export async function getOrders(batchId?: string): Promise<Order[]> {
  const db = serviceClient();
  if (!db) return batchId ? ORDERS.filter((o) => o.batch_id === batchId) : ORDERS;

  let q = db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (batchId) q = q.eq("batch_id", batchId);
  const { data } = await q;
  return (data ?? []).map((o) => ({ ...o, items: o.order_items ?? [] })) as Order[];
}

/** 顾客自己的订单。未登录返回空数组，不泄露任何订单 */
export async function getOrdersForUser(profileId: string | null): Promise<Order[]> {
  const db = serviceClient();
  if (!db) return profileId ? [] : ORDERS.slice(0, 3);   // 演示模式给几条看效果
  if (!profileId) return [];

  const { data } = await db.from("orders")
    .select("*, order_items(*)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => ({ ...o, items: o.order_items ?? [] })) as Order[];
}

/**
 * 后台专用：连已下架的商品和规格一起返回。
 * 前台的 getProducts() 会过滤 active=true，后台用它就看不见下架项、
 * 也就没法重新上架，所以单开一个。
 */
export async function getProductsForAdmin(): Promise<Product[]> {
  const db = serviceClient();
  if (!db) return PRODUCTS;

  const { data: products } = await db
    .from("products").select("*").order("sort_order");
  const { data: variants } = await db
    .from("variants").select("*").order("sort_order");
  if (!products) return PRODUCTS;

  return products.map((p) => ({
    ...p,
    variants: (variants ?? []).filter((v) => v.product_id === p.id) as Variant[],
  })) as Product[];
}
