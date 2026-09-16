import { NextResponse } from "next/server";
import { isTeaser } from "@/lib/site-mode";
import { z } from "zod";
import { stripe, stripeConfigured, paymentMethodTypes } from "@/lib/stripe";
import { getCurrentBatch, getProducts, effectivePrice } from "@/lib/data";
import { createPendingOrder, validateOrder, HOLD_MINUTES } from "@/lib/orders";
import { serviceClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase";

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
});

export async function POST(req: Request) {
  // 预热期还没开张，下单接口一律关闭
  if (isTeaser) return NextResponse.json({ error: "not_open_yet" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }
  const { locale, batchId, slotId, items, contact } = parsed.data;

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

  // ---- Stripe 未接入：进模拟支付页，走同一套状态流转 ----
  if (!stripeConfigured) {
    return NextResponse.json({ url: `/${locale}/pay/${orderNo}` });
  }

  // ---- Stripe 已接入 ----
  const s = stripe()!;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const session = await s.checkout.sessions.create({
    mode: "payment",
    locale: locale === "zh" ? "zh" : "en",
    payment_method_types: paymentMethodTypes(),
    currency: "cad",
    customer_email: contact.email,
    // 到点由 Stripe 推送 checkout.session.expired，据此释放名额，不用 cron 轮询
    expires_at: Math.floor(expiresAt.getTime() / 1000),
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
    metadata: { order_no: orderNo, batch_id: batch!.id, slot_id: slotId, locale },
    success_url: `${origin}/${locale}/success?order=${orderNo}`,
    cancel_url: `${origin}/${locale}/order`,
  });

  const db = serviceClient();
  if (db && orderId) {
    await db.from("orders").update({ payment_ref: session.id }).eq("id", orderId);
  }

  return NextResponse.json({ url: session.url, holdMinutes: HOLD_MINUTES, subtotal });
}
