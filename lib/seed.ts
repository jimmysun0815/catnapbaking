import type { Batch, Flavour, Order, Product } from "./types";

/**
 * 演示数据。没有配置 Supabase 时整站跑在这份数据上，
 * 这样公司注册、Stripe 开户之前就能看到并测试完整流程。
 */

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const FLAVOURS: Flavour[] = [
  {
    id: "f-classic",
    slug: "classic-chocolate-chip",
    name_zh: "经典巧克力曲奇",
    name_en: "Classic Chocolate Chip",
    desc_zh: "比利时黑巧克力，海盐收尾。外缘脆，中心软。",
    desc_en: "Belgian dark chocolate, finished with sea salt. Crisp edges, soft centre.",
  },
  {
    id: "f-sesame",
    slug: "black-sesame",
    name_zh: "黑芝麻",
    name_en: "Black Sesame",
    desc_zh: "现磨黑芝麻酱，烘香浓，回口不腻。",
    desc_en: "Stone-ground black sesame paste, deeply toasted.",
  },
  {
    id: "f-osmanthus",
    slug: "osmanthus-oolong",
    name_zh: "桂花乌龙",
    name_en: "Osmanthus Oolong",
    desc_zh: "乌龙茶粉配干桂花，茶香清淡。",
    desc_en: "Oolong tea powder with dried osmanthus blossom.",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "p-cookie",
    slug: "cookies",
    name_zh: "手工曲奇",
    name_en: "Handmade Cookies",
    desc_zh: "每周现烤，小批量制作。",
    desc_en: "Baked fresh once a week, in small batches.",
    // 初期单一产品，后台可改成 single 或 mix
    flavour_mode: "none",
    max_flavours_per_box: null,
    variants: [
      {
        id: "v-6",
        sku: "CN-BOX-6",
        name_zh: "6 个装",
        name_en: "Box of 6",
        cookie_count: 6,
        price_cents: 2600,
        sort_order: 1,
      },
      {
        id: "v-12",
        sku: "CN-GIFT-12",
        name_zh: "12 个礼盒",
        name_en: "Gift Box of 12",
        cookie_count: 12,
        price_cents: 4600,
        sort_order: 2,
      },
    ],
  },
];

export const BATCHES: Batch[] = [
  {
    id: "b-current",
    name_zh: "本周批次 · 经典巧克力曲奇",
    name_en: "This Week's Drop · Classic Chocolate Chip",
    status: "open",
    opens_at: at(-1, 10),
    closes_at: at(1, 22),
    bake_date: null,
    capacity_boxes: 80,
    boxes_taken: 47,
    pickup_address: "Richmond, BC（下单后邮件告知具体地址）",
    pickup_note_zh: "取货时请出示订单号。冷藏可放 5 天，室温 2 天。",
    pickup_note_en: "Show your order number at pickup. Keeps 5 days refrigerated, 2 days at room temperature.",
    slots: [
      { id: "s-1", starts_at: at(2, 14), ends_at: at(2, 15), max_orders: 12, orders_taken: 12 },
      { id: "s-2", starts_at: at(2, 15), ends_at: at(2, 16), max_orders: 12, orders_taken: 7 },
      { id: "s-3", starts_at: at(2, 16), ends_at: at(2, 17), max_orders: 12, orders_taken: 3 },
    ],
    flavour_ids: ["f-classic"],
    prices: {},
  },
];

/** 后台演示订单 */
export const ORDERS: Order[] = [
  {
    id: "o-1", order_no: "CN-2609-0042", batch_id: "b-current",
    status: "paid", channel: "web",
    contact_name: "林小姐", contact_phone: "604-555-0142", contact_email: "lin@example.com",
    slot_id: "s-1", subtotal_cents: 4600, total_cents: 4600, fee_cents: 163,
    payment_method: "card", gift_message: null,
    created_at: at(0, 11, 12), paid_at: at(0, 11, 13),
    items: [{ variant_id: "v-12", flavour_id: "f-classic", quantity: 1, unit_price_cents: 4600, variant_name_zh: "12 个礼盒", variant_name_en: "Gift Box of 12", cookie_count: 12 }],
  },
  {
    id: "o-2", order_no: "CN-2609-0041", batch_id: "b-current",
    status: "paid", channel: "wechat",
    contact_name: "Wang", contact_phone: "778-555-0199", contact_email: "wang@example.com",
    slot_id: "s-1", subtotal_cents: 5200, total_cents: 5200, fee_cents: 0,
    payment_method: "etransfer", gift_message: "生日快乐",
    created_at: at(0, 10, 40), paid_at: at(0, 10, 55),
    items: [{ variant_id: "v-6", flavour_id: "f-classic", quantity: 2, unit_price_cents: 2600, variant_name_zh: "6 个装", variant_name_en: "Box of 6", cookie_count: 6 }],
  },
  {
    id: "o-3", order_no: "CN-2609-0040", batch_id: "b-current",
    status: "paid", channel: "web",
    contact_name: "Chen", contact_phone: "604-555-0177", contact_email: "chen@example.com",
    slot_id: "s-2", subtotal_cents: 2600, total_cents: 2600, fee_cents: 105,
    payment_method: "wechat_pay", gift_message: null,
    created_at: at(0, 9, 5), paid_at: at(0, 9, 6),
    items: [{ variant_id: "v-6", flavour_id: "f-classic", quantity: 1, unit_price_cents: 2600, variant_name_zh: "6 个装", variant_name_en: "Box of 6", cookie_count: 6 }],
  },
  {
    id: "o-4", order_no: "CN-2609-0039", batch_id: "b-current",
    status: "paid", channel: "b2b",
    contact_name: "Pacific Realty", contact_phone: "604-555-0100", contact_email: "office@example.com",
    slot_id: "s-3", subtotal_cents: 46000, total_cents: 46000, fee_cents: 0,
    payment_method: "etransfer", gift_message: "客户答谢",
    created_at: at(-1, 16, 20), paid_at: at(-1, 17, 0),
    items: [{ variant_id: "v-12", flavour_id: "f-classic", quantity: 10, unit_price_cents: 4600, variant_name_zh: "12 个礼盒", variant_name_en: "Gift Box of 12", cookie_count: 12 }],
  },
  {
    id: "o-5", order_no: "CN-2609-0038", batch_id: "b-current",
    status: "pending", channel: "web",
    contact_name: "Zhao", contact_phone: "778-555-0123", contact_email: "zhao@example.com",
    slot_id: "s-2", subtotal_cents: 2600, total_cents: 2600, fee_cents: 0,
    payment_method: null, gift_message: null,
    created_at: at(0, 12, 30), paid_at: null,
    items: [{ variant_id: "v-6", flavour_id: "f-classic", quantity: 1, unit_price_cents: 2600, variant_name_zh: "6 个装", variant_name_en: "Box of 6", cookie_count: 6 }],
  },
];
