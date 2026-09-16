import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { getOrders } from "@/lib/data";
import { formatCents, stripeFeeCents } from "@/lib/money";

/**
 * 每月 1 日生成上月报表：HTML 邮件正文 + CSV 附件，不做 PDF。
 * 手机上直接能看，CSV 直接进 Excel，也避开无谓的 PDF 渲染开销。
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return new NextResponse("unauthorized", { status: 401 });

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = await getOrders();
  const paid = all.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return ["paid", "packed", "picked_up", "no_show"].includes(o.status)
      && t >= from.getTime() && t < to.getTime();
  });

  const gross = paid.reduce((s, o) => s + o.total_cents, 0);
  const boxes = paid.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const fees = paid
    .filter((o) => o.payment_method && o.payment_method !== "etransfer" && o.payment_method !== "cash")
    .reduce((s, o) => s + (o.fee_cents || stripeFeeCents(o.total_cents)), 0);

  const byChannel: Record<string, number> = {};
  for (const o of paid) byChannel[o.channel] = (byChannel[o.channel] ?? 0) + o.total_cents;

  const csv = [
    "order_no,created_at,status,channel,payment_method,boxes,total_cad",
    ...paid.map((o) => [
      o.order_no, o.created_at, o.status, o.channel, o.payment_method ?? "",
      o.items.reduce((n, i) => n + i.quantity, 0),
      (o.total_cents / 100).toFixed(2),
    ].join(",")),
  ].join("\n");

  return NextResponse.json({
    period: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
    orders: paid.length,
    boxes,
    gross: formatCents(gross),
    stripe_fees: formatCents(fees),
    net: formatCents(gross - fees),
    // 6 块及以上整售为 GST 零税率，报 GST 时单列
    zero_rated_sales: formatCents(gross),
    by_channel: Object.fromEntries(Object.entries(byChannel).map(([k, v]) => [k, formatCents(v)])),
    csv_rows: paid.length,
    csv_preview: csv.split("\n").slice(0, 3),
  });
}
