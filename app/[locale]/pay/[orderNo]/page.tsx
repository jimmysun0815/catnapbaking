import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { MockPay } from "@/components/MockPay";
import { mockPaymentsEnabled } from "@/lib/payments";
import { getOrderByNo } from "@/lib/orders";
import { usingDemoData } from "@/lib/data";
import type { Locale } from "@/lib/types";
import { getIsTeaser } from "@/lib/site-mode";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: { params: Promise<{ locale: string; orderNo: string }> }) {
  const { locale: raw, orderNo } = await params;
  const locale = raw as Locale;

  // 预热期下单相关页面一律回首页
  if (await getIsTeaser()) redirect(`/${locale}`);

  // Stripe 接入后这个页面不该再被访问到
  if (!mockPaymentsEnabled) redirect(`/${locale}/order`);

  const order = await getOrderByNo(orderNo);

  // 没接数据库时也要能走通流程，用订单号回显一条占位摘要
  if (!order && !usingDemoData) notFound();

  const lines = order
    ? (order.order_items ?? []).map((i: {
        variant_name_zh: string; variant_name_en: string;
        quantity: number; unit_price_cents: number;
      }) => ({
        name: locale === "zh" ? i.variant_name_zh : i.variant_name_en,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
      }))
    : [{ name: locale === "zh" ? "本期曲奇" : "This week's box", quantity: 1, unit_price_cents: 2600 }];

  const total = order?.total_cents ?? lines.reduce(
    (s: number, l: { quantity: number; unit_price_cents: number }) => s + l.quantity * l.unit_price_cents, 0
  );

  const slot = order?.pickup_slots;
  const pickup = slot
    ? `${new Date(slot.starts_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-CA", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })}`
    : null;

  return (
    <PageShell locale={locale}>
      <MockPay locale={locale} orderNo={orderNo} total={total} lines={lines} pickup={pickup} />
    </PageShell>
  );
}
