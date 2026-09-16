import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrdersForUser } from "@/lib/data";
import { getSessionUser } from "@/lib/supabase/server";
import { formatCents } from "@/lib/money";
import { PageShell } from "@/components/PageShell";
import type { Locale } from "@/lib/types";
import { isTeaser } from "@/lib/site-mode";

// 顾客自己的订单，必须实时读取
export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  // 预热期下单相关页面一律回首页
  if (isTeaser) redirect(`/${locale}`);
  const zh = locale === "zh";

  const user = await getSessionUser();
  const orders = await getOrdersForUser(user?.id ?? null);

  return (
    <PageShell locale={locale} user={user ? { name: user.name, email: user.email, isAdmin: user.isAdmin } : null}>
      <section className="page-shell">
        <div className="page-head">
          <div>
            <div className="section-index">{zh ? "我的订单" : "my orders"}</div>
            <h1>{zh ? "你买过的" : "What you've ordered"}</h1>
          </div>
          <Link href={`/${locale}/login`} className="link-quiet">
            {zh ? "登录 / 切换账号 →" : "Sign in / switch account →"}
          </Link>
        </div>

        <div className="order-history">
          {orders.map((o) => (
            <article className="history-row" key={o.id}>
              <div>
                <div className="history-no">{o.order_no}</div>
                <div className="history-items">
                  {o.items.map((i, n) => (
                    <div key={n}>{(zh ? i.variant_name_zh : i.variant_name_en)} × {i.quantity}</div>
                  ))}
                </div>
                <div className="history-date">
                  {new Date(o.created_at).toLocaleString(zh ? "zh-CN" : "en-CA")}
                </div>
              </div>
              <div className="history-amount">{formatCents(o.total_cents, locale)}</div>
            </article>
          ))}
        </div>

        <p className="admin-foot-note" style={{ maxWidth: 560 }}>
          {zh
            ? "企业订单可在这里下载含 GST 号的 PDF 发票，用于报销。"
            : "Corporate orders can download a PDF invoice with our GST number here."}
        </p>
      </section>
    </PageShell>
  );
}
