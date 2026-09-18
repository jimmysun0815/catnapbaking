/**
 * 中英文不是互译，是两套不同的叙事：
 *   中文 → 减糖 70%、秘方、原料品质，研究所气质
 *   英文 → Canadian-owned、Richmond 本地烘焙、加拿大原料，手工气质
 * 文案按 CFIA 规则写：比较型营养声明必须同屏说明参照物和每份差多少。
 */

export const zh = {
  brand: "不太甜研究所",
  brandSub: "Cat Nap Baking",
  nav: { order: "本期开单", about: "关于我们", faq: "常见问题", account: "我的订单", login: "登录" },
  langSwitch: "English",

  hero: {
    eyebrow: "秘方配方 · 小批量手工",
    headline: "甜一点的日子",
    headlineAccent: "不必太甜。",
    // CFIA 比较型营养声明用的说明文案。2026-09-18 起首页不再渲染（站主决定），
    // 字符串保留以便随时恢复。见 HomeZh.tsx 顶部说明。
    claimFootnote: "相比我们的经典配方，每块含糖 4.2 g（经典配方 14 g）",
    lead: "把糖收低，把巧克力、茶香和黄油的香气留出来。",
    leadSecond: "一盒手工曲奇，送给值得慢慢吃的人。",
    cta: "查看本期开单",
    ctaClosed: "查看下期预告",
  },

  statement: {
    eyebrow: "不太甜，是一种生活方式",
    heading: "我们不想做",
    headingAccent: "吃完只剩下甜",
    headingTail: "的曲奇",
    body: "秘方配方减少 70% 糖用量，让可可的深度、抹茶的回甘和坚果的香气自己说话。甜度收低，也让每一口更轻盈。",
  },

  pillars: {
    title: "我们改了什么",
    items: [
      { k: "糖", v: "减 70%", d: "配方里的糖从 14 g 降到 4.2 g 每块。甜度退到背景，可可和黄油的味道才出得来。" },
      { k: "口感", v: "外脆内软", d: "边缘烤到脆，中心保持半流心的软。出炉后静置 12 分钟定型，这一步决定成败。" },
      { k: "原料", v: "不将就", d: "比利时黑巧克力、加拿大黄油和面粉、马达加斯加香草、法国海盐。" },
    ],
  },

  how: {
    title: "怎么买",
    steps: [
      { n: "01", t: "每周开单", d: "周六上午 10 点开单，当晚 10 点截单。数量有限，售完即止。" },
      { n: "02", t: "线上付款", d: "支持信用卡、微信支付、支付宝。付款后收到确认邮件。" },
      { n: "03", t: "周日自取", d: "在 Richmond 约定地点，按你选的时段取货。具体地址付款后邮件告知。" },
    ],
  },

  order: {
    title: "本期开单",
    remaining: "本期剩余",
    boxes: "盒",
    soldOut: "本期售罄",
    closesIn: "距截单",
    closed: "本期已截单",
    noBatch: "本期尚未开单",
    noBatchDesc: "我们每周开一次单。留下邮箱，开单时第一时间通知你。",
    pickTime: "选择自取时段",
    slotFull: "已约满",
    checkout: "去结账",
    subtotal: "小计",
    quantity: "数量",
    pickupAt: "自取地点",
    gstNote: "6 个及以上整售，GST 零税率，不额外收税。",
  },

  faq: {
    title: "常见问题",
    items: [
      { q: "怎么保存？", a: "室温密封 2 天，冷藏 5 天。吃之前烤箱 150°C 回炉 3 分钟，口感接近刚出炉。" },
      { q: "有什么过敏原？", a: "含小麦、鸡蛋、牛奶、大豆。厨房同时处理坚果，无法保证完全无坚果交叉污染。" },
      { q: "可以改单或退款吗？", a: "截单前可改可退。截单后已进入生产，不接受退款，但可以改由他人代取。" },
      { q: "能送货吗？", a: "目前只做定点自取。配送在计划中，开通后会在群里通知。" },
      { q: "可以订企业礼盒吗？", a: "可以。10 盒以上请走企业询价，我们单独安排生产和取货时间。" },
    ],
  },

  footer: {
    company: "Cat Nap Baking Ltd.",
    location: "Richmond, British Columbia",
    rights: "保留所有权利",
    nutritionNote: "营养成分以包装标示为准。",
  },
} as const;

export const en = {
  brand: "Cat Nap",
  brandSub: "Baking Ltd.",
  nav: { order: "This Week's Drop", about: "Our Story", faq: "FAQ", account: "My Orders", login: "Sign in" },
  langSwitch: "中文",

  hero: {
    eyebrow: "Canadian-owned · Richmond, BC",
    headline: "Baked here,\nwith what grows here.",
    lead: "Crisp edges, soft centres. Made with Canadian butter, flour and eggs, in small batches, once a week.",
    cta: "See this week's drop",
    ctaClosed: "Get notified",
  },

  pillars: {
    title: "What goes in",
    items: [
      { k: "Butter", v: "Canadian", d: "Cultured butter from Canadian dairy. It is most of the flavour, so it is not the place to save money." },
      { k: "Flour", v: "Canadian", d: "Unbleached all-purpose flour milled from Canadian wheat." },
      { k: "Eggs", v: "Canadian", d: "Free-run eggs from BC farms." },
    ],
    // CFIA：可可、糖、香草不产自加拿大，不能宣称全部原料加拿大
    footnote: "Made in Canada with domestic and imported ingredients. Chocolate, sugar and vanilla are sourced abroad.",
  },

  how: {
    title: "How it works",
    steps: [
      { n: "01", t: "Order Saturday", d: "Ordering opens Saturday 10am and closes at 10pm. We bake a fixed number of boxes." },
      { n: "02", t: "Pay online", d: "Card, WeChat Pay or Alipay. You get a confirmation email right away." },
      { n: "03", t: "Pick up Sunday", d: "Collect in Richmond during the time slot you chose. Address is emailed after payment." },
    ],
  },

  order: {
    title: "This Week's Drop",
    remaining: "Boxes left",
    boxes: "boxes",
    soldOut: "Sold out",
    closesIn: "Closes in",
    closed: "Ordering closed",
    noBatch: "No drop open right now",
    noBatchDesc: "We open orders once a week. Leave your email and we'll tell you when the next one goes live.",
    pickTime: "Choose a pickup time",
    slotFull: "Full",
    checkout: "Checkout",
    subtotal: "Subtotal",
    quantity: "Quantity",
    pickupAt: "Pickup",
    gstNote: "Boxes of 6 or more are GST zero-rated. No tax is added.",
  },

  faq: {
    title: "Questions",
    items: [
      { q: "How should I store them?", a: "Sealed at room temperature for 2 days, refrigerated for 5. Warm at 150°C for 3 minutes to bring them back." },
      { q: "What are the allergens?", a: "Contains wheat, egg, milk and soy. Our kitchen also handles nuts, so we cannot guarantee a nut-free product." },
      { q: "Can I change or cancel?", a: "Yes, any time before ordering closes. After that we've already started baking, but someone else can collect for you." },
      { q: "Do you deliver?", a: "Not yet. Pickup only for now. Delivery is planned and we'll announce it when it opens." },
      { q: "Corporate gift boxes?", a: "Yes. For 10 boxes or more, use the corporate enquiry form and we'll schedule a dedicated bake." },
    ],
  },

  footer: {
    company: "Cat Nap Baking Ltd.",
    location: "Richmond, British Columbia",
    rights: "All rights reserved",
    nutritionNote: "See package for nutrition information.",
  },
} as const;

export type Content = typeof zh | typeof en;
export function content(locale: "zh" | "en") {
  return locale === "zh" ? zh : en;
}
