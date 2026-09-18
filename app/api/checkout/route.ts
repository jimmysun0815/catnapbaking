import { NextResponse } from "next/server";
import { getIsTeaser } from "@/lib/site-mode";
import { normalizeSiteUrl } from "@/lib/site";
import { z } from "zod";
import { stripe, stripeConfigured, INTEGRATION_ID } from "@/lib/stripe";
import { getCurrentBatch, getProducts, effectivePrice } from "@/lib/data";
import { createPendingOrder, validateOrder, releaseOrderHold, HOLD_MINUTES } from "@/lib/orders";
import { serviceClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase";
import { redeemCoupon, COUPON_MESSAGE } from "@/lib/coupons";

const Body = z.object({
  locale: z.enum(["zh", "en"]),
  batchId: z.string(),
  slotId: z.string(),
  contact: z.object({
    name: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(6).max(30),
    email: z.string().trim().email(),
    giftMessage: z.string().trim().max(200).optional().nullable(),
  }),
  items: z.array(z.object({
    variantId: z.string(),
    quantity: z.number().int().positive().max(50),
    flavourId: z.string().nullable().optional(),
  })).min(1),
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
});

export async function POST(req: Request) {
  // 预热期还没开张，下单接口一律关闭
  if (await getIsTeaser()) return NextResponse.json({ error: "not_open_yet" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }
  const { locale, batchId, slotId, items, contact, couponCode } = parsed.data;

  // 下单必须登录：收据、取货提醒和订单历史都要绑到账户上。
  // 还没接 Supabase 时（演示模式）跳过这一步，否则本地没法走流程。
  const user = await getSessionUser();
  if (isConfigured && !user) {
    return NextResponse.json({ error: "login required", loginRequired: true }, { status: 401 });
  }

  const [batch, products] = await Promise.all([getCurrentBatch(), getProducts()]);
  const variants = products.flatMap((p) => p.variants);

  const lines = items.map((it) => {
    const variant = variants.find((v) => v.id === it.variantId);
    if (!variant) return null;
    return { variant, quantity: it.quantity, flavourId: it.flavourId ?? null };
  });
  if (lines.some((l) => l === null)) {
    return NextResponse.json({ error: "unknown variant" }, { status: 400 });
  }
  const valid = lines as NonNullable<(typeof lines)[number]>[];
  const boxes = valid.reduce((n, l) => n + l.quantity, 0);

  const check = validateOrder(batch, batchId, slotId, boxes);
  if (!check.ok) {
    return NextResponse.json(
      { error: check.error, remaining: check.remaining },
      { status: check.status }
    );
  }

  const { orderNo, orderId, subtotal, expiresAt } = await createPendingOrder({
    batch: batch!, slotId, lines: valid, contact, profileId: user?.id ?? null,
  });

  // 折扣一律服务端算。前端传来的金额只用于显示，不参与计价
  let discount = 0;
  if (couponCode && orderId) {
    const r = await redeemCoupon(couponCode, orderId, subtotal);
    if (!r.ok) {
      // 券不可用就整单退回，让顾客自己决定去掉券还是换一张，
      // 比默默按原价收钱强
      await releaseOrderHold(orderNo, "cancelled");
      return NextResponse.json(
        { error: "coupon_rejected", couponReason: r.reason, message: COUPON_MESSAGE[r.reason] },
        { status: 409 }
      );
    }
    discount = r.discountCents;
  }
  const payable = Math.max(subtotal - discount, 0);

  // ---- Stripe 未接入：进模拟支付页，走同一套状态流转 ----
  if (!stripeConfigured) {
    return NextResponse.json({
      url: `/${locale}/pay/${orderNo}`, subtotal, discount, total: payable,
    });
  }

  // ---- Stripe 已接入 ----
  const s = stripe()!;
  const origin = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? new URL(req.url).origin;

  // Stripe 要求 expires_at 至少比「它收到请求的那一刻」晚 30 分钟。
  // expiresAt 是建单前算的，中间隔着数据库写入和网络往返，直接用会卡在
  // 29:5x 被拒。取两者较晚的一个，留出余量。
  const stripeExpiresAt = Math.floor(
    Math.max(expiresAt.getTime(), Date.now() + (HOLD_MINUTES + 2) * 60_000) / 1000
  );

  // 折扣用一次性 Stripe 券传过去。不改 line_items 单价：
  // 按比例摊到每行会产生分位舍入，和库里记的 total 对不上
  const stripeDiscounts = discount > 0
    ? [{ coupon: (await s.coupons.create({
          amount_off: discount, currency: "cad", duration: "once",
          name: locale === "zh" ? "优惠码" : "Discount",
        })).id }]
    : undefined;

  const session = await s.checkout.sessions.create({
    mode: "payment",
    locale: locale === "zh" ? "zh" : "en",
    currency: "cad",
    customer_email: contact.email,
    // 到点由 Stripe 推送 checkout.session.expired，据此释放名额，不用 cron 轮询
    expires_at: stripeExpiresAt,
    line_items: valid.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: "cad",
        unit_amount: effectivePrice(batch!, l.variant),
        product_data: {
          name: locale === "zh" ? l.variant.name_zh : l.variant.name_en,
          description: locale === "zh"
            ? `每盒 ${l.variant.cookie_count} 块`
            : `${l.variant.cookie_count} cookies`,
        },
      },
    })),
    discounts: stripeDiscounts,
    integration_identifier: INTEGRATION_ID,
    metadata: {
      order_no: orderNo, batch_id: batch!.id, slot_id: slotId, locale,
      coupon_code: couponCode ?? "", discount_cents: String(discount),
    },
    success_url: `${origin}/${locale}/success?order=${orderNo}`,
    cancel_url: `${origin}/${locale}/order`,
  });

  const db = serviceClient();
  if (db && orderId) {
    // 名额真正的释放时机由 Stripe 的 session 过期决定，
    // 库里存它返回的实际值，倒计时才不会和现实对不上
    await db.from("orders").update({
      payment_ref: session.id,
      expires_at: new Date((session.expires_at ?? stripeExpiresAt) * 1000).toISOString(),
    }).eq("id", orderId);
  }

  return NextResponse.json({
    url: session.url, holdMinutes: HOLD_MINUTES, subtotal, discount, total: payable,
  });
}
