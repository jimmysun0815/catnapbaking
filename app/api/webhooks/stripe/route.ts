import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { markOrderPaid, releaseOrderHold, markOrderRefunded } from "@/lib/orders";

/**
 * Stripe webhook。Stripe 开户后配上 STRIPE_WEBHOOK_SECRET 即生效。
 *
 * 这里是「30 分钟释放名额」的实现：不轮询数据库，
 * 由 Stripe 在 session 过期时推送 checkout.session.expired。
 * 所以我们不需要小时级以下的 cron，Vercel 每天一次的额度就够。
 *
 * 状态流转全部委托给 lib/orders.ts，和模拟支付走同一套逻辑。
 */
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    // 签名校验失败一律拒绝，防伪造
    return NextResponse.json(
      { error: `signature verification failed: ${err instanceof Error ? err.message : err}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderNo = session.metadata?.order_no;
        if (!orderNo) break;
        await markOrderPaid({
          orderNo,
          method: session.payment_method_types?.[0] ?? "card",
          eventId: event.id,                       // Stripe 会重推，靠它幂等
          paymentRef: session.id,
          // 退款事件只带 payment_intent，付款时不记下来，以后就对不上单
          paymentIntentRef: typeof session.payment_intent === "string"
            ? session.payment_intent : null,
          totalCents: session.amount_total ?? null,
          contact: {
            name: session.customer_details?.name ?? undefined,
            phone: session.customer_details?.phone ?? undefined,
            email: session.customer_details?.email ?? undefined,
          },
        });
        break;
      }

      case "checkout.session.expired": {
        // 30 分钟未付款，释放名额
        const orderNo = event.data.object.metadata?.order_no;
        if (orderNo) await releaseOrderHold(orderNo, "expired");
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (pi) await markOrderRefunded(pi);
        break;
      }
    }
  } catch (e) {
    // 返回 500 让 Stripe 重推
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
