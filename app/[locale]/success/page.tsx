import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { CatMarkLarge } from "@/components/BrandMark";
import type { Locale } from "@/lib/types";

export default async function SuccessPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const [{ locale: raw }, { order }] = await Promise.all([params, searchParams]);
  const locale = raw as Locale;
  const zh = locale === "zh";

  return (
    <PageShell locale={locale}>
      <section className="success-shell">
        <div className="success-seal">
          <CatMarkLarge size={96} />
        </div>
        <h1>{zh ? "谢谢，我们开始准备了" : "Thank you — we're on it"}</h1>
        {order && <p className="success-no">{order}</p>}
        <p className="success-lede">
          {zh
            ? "确认邮件已发到你的邮箱，里面有取货地址和时段。取货前一天我们还会再提醒一次。"
            : "A confirmation email with the pickup address and time is on its way. We'll remind you the day before."}
        </p>
        <Link href={`/${locale}/account`} className="order-button">
          {zh ? "查看我的订单" : "View my orders"}
        </Link>
      </section>
    </PageShell>
  );
}
