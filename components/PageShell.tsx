import { Header, Footer, type NavUser } from "@/components/SiteChrome";
import type { Locale } from "@/lib/types";

export function PageShell({ locale, children, user = null }: { locale: Locale; children: React.ReactNode; user?: NavUser }) {
  const zh = locale === "zh";
  return (
    <div className={`site ${zh ? "zh-site" : "en-site"}`}>
      {!zh && <div className="en-noise" />}
      <Header locale={locale} user={user} />
      <main>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
