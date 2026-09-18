import { NextResponse } from "next/server";
import { z } from "zod";
import { getIsTeaser } from "@/lib/site-mode";
import { getCurrentBatch, getProducts, effectivePrice } from "@/lib/data";
import { previewCoupon, COUPON_MESSAGE } from "@/lib/coupons";

/**
 * 下单页输入券码时的实时校验。只读，不占用次数。
 *
 * 金额由服务端按购物车重算，不接受前端传金额 —— 否则有人传个
 * 很大的 subtotal 就能骗过「最低消费」门槛，看到本不该有的折扣提示。
 * 真正的核销在结账时还会再算一次。
 */
const Body = z.object({
  code: z.string().trim().min(1).max(40),
  items: z.array(z.object({
    variantId: z.string(),
    quantity: z.number().int().positive().max(50),
  })).min(1),
});

export async function POST(req: Request) {
  if (await getIsTeaser()) return NextResponse.json({ error: "not_open_yet" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "请求有误" }, { status: 400 });
  }
  const { code, items } = parsed.data;

  const [batch, products] = await Promise.all([getCurrentBatch(), getProducts()]);
  const variants = products.flatMap((p) => p.variants);

  let subtotal = 0;
  for (const it of items) {
    const v = variants.find((x) => x.id === it.variantId);
    if (!v) return NextResponse.json({ ok: false, message: "购物车有误" }, { status: 400 });
    subtotal += effectivePrice(batch, v) * it.quantity;
  }

  const r = await previewCoupon(code, subtotal);
  return NextResponse.json({
    ok: r.ok,
    message: COUPON_MESSAGE[r.reason],
    discount: r.discountCents,
    subtotal,
    total: Math.max(subtotal - r.discountCents, 0),
  });
}
