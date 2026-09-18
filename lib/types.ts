export type Locale = "zh" | "en";

export type FlavourMode = "none" | "single" | "mix";

export type Flavour = {
  id: string;
  slug: string;
  name_zh: string;
  name_en: string;
  desc_zh: string | null;
  desc_en: string | null;
};

export type Variant = {
  id: string;
  sku: string;
  name_zh: string;
  name_en: string;
  cookie_count: number;
  price_cents: number;
  sort_order: number;
  /** 演示数据里没有这个字段，视为上架 */
  active?: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name_zh: string;
  name_en: string;
  desc_zh: string | null;
  desc_en: string | null;
  flavour_mode: FlavourMode;
  max_flavours_per_box: number | null;
  variants: Variant[];
};

export type PickupSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  max_orders: number;
  orders_taken: number;
};

export type Batch = {
  id: string;
  name_zh: string;
  name_en: string;
  status: "draft" | "open" | "closed" | "completed" | "cancelled";
  opens_at: string;
  closes_at: string;
  bake_date: string | null;
  capacity_boxes: number;
  boxes_taken: number;
  pickup_address: string;
  pickup_note_zh: string | null;
  pickup_note_en: string | null;
  slots: PickupSlot[];
  flavour_ids: string[];
  /** 批次专属价，variant_id -> price_cents */
  prices: Record<string, number>;
};

export type OrderStatus =
  | "pending" | "paid" | "packed" | "picked_up"
  | "no_show" | "refunded" | "expired" | "cancelled";

export type OrderItem = {
  variant_id: string;
  flavour_id: string | null;
  quantity: number;
  unit_price_cents: number;
  variant_name_zh: string;
  variant_name_en: string;
  cookie_count: number;
};

export type Order = {
  id: string;
  order_no: string;
  batch_id: string;
  status: OrderStatus;
  channel: "web" | "wechat" | "b2b" | "platform";
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  slot_id: string | null;
  subtotal_cents: number;
  total_cents: number;
  fee_cents: number;
  payment_method: string | null;
  gift_message: string | null;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
};
