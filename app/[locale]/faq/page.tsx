import { content } from "@/lib/content";
import { PageShell } from "@/components/PageShell";
import { getSessionUser } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const t = content(locale);
  const user = await getSessionUser();

  return (
    <PageShell locale={locale} user={user ? { name: user.name, email: user.email, isAdmin: user.isAdmin } : null}>
      <section className="page-shell">
        <div className="page-head">
          <div>
            <div className="section-index">{locale === "zh" ? "常见问题" : "questions"}</div>
            <h1>{t.faq.title}</h1>
          </div>
        </div>
        <div className="faq-list">
          {t.faq.items.map((it, i) => (
            <div className="faq-item" key={it.q}>
              <div className="faq-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="faq-q">{it.q}</div>
              <div className="faq-a">{it.a}</div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
