import { NextResponse } from "next/server";
import { isTeaser } from "@/lib/site-mode";
import { z } from "zod";
import { mockPaymentsEnabled, MOCK_METHODS } from "@/lib/payments";
import { markOrderPaid, releaseOrderHold } from "@/lib/orders";

const Body = z.object({
  orderNo: z.string().trim().min(3).max(40),
  outcome: z.enum(["success", "failure"]),
  method: z.enum(MOCK_METHODS).default("card"),
});

/**
 * 模拟支付。Stripe 开户前用它跑通整条链路，
 * 走的是和真支付完全一样的状态流转（lib/orders.ts）。
 * 一旦配上 STRIPE_SECRET_KEY，这个接口直接 404，线上不可能手动点成功。
 */
export async function POST(req: Request) {
  // 预热期还没开张，下单接口一律关闭
  if (isTeaser) return NextResponse.json({ error: "not_open_yet" }, { status: 404 });

  if (!mockPaymentsEnabled) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { orderNo, outcome, method } = parsed.data;

  try {
    if (outcome === "success") {
      // eventId 用订单号派生，重复点击不会重复处理
      const res = await markOrderPaid({
        orderNo,
        method,
        eventId: `mock:paid:${orderNo}`,
        paymentRef: `mock_${orderNo}`,
      });
      return NextResponse.json({ ok: true, alreadyDone: res.alreadyDone ?? false });
    }
    await releaseOrderHold(orderNo, "cancelled");
    return NextResponse.json({ ok: true, released: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
