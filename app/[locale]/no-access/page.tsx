import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getSessionUser } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 登录了但不是管理员时落到这里，告诉他该怎么办，而不是一句「无权限」 */
export default async function NoAccess({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const zh = locale === "zh";
  const user = await getSessionUser();

  return (
    <PageShell locale={locale}>
      <section className="empty-shell">
        <div className="section-index">{zh ? "没有权限" : "no access"}</div>
        <h1>{zh ? "这个账号不是管理员" : "This account isn't an admin"}</h1>
        <p>
          {zh
            ? "后台只有管理员能进。如果这是你自己的店，在 Supabase 里把这个账号标成管理员就行。"
            : "The admin area is restricted. If this is your own shop, mark this account as an admin in Supabase."}
        </p>
        {user && (
          <p className="notice-box" style={{ textAlign: "left", maxWidth: 460, margin: "0 auto 28px" }}>
            <code style={{ fontSize: 12, wordBreak: "break-all" }}>
              update profiles set is_admin = true where email = &apos;{user.email}&apos;;
            </code>
          </p>
        )}
        <Link href={`/${locale}`} className="order-button">{zh ? "返回首页" : "Back home"}</Link>
      </section>
    </PageShell>
  );
}
