import { Header, Footer, type NavUser } from "@/components/SiteChrome";
import type { Locale } from "@/lib/types";
import { getIsTeaser } from "@/lib/site-mode";

export async function PageShell({ locale, children, user = null }: { locale: Locale; children: React.ReactNode; user?: NavUser }) {
  const zh = locale === "zh";
  const isTeaser = await getIsTeaser();
  return (
    <div className={`site ${zh ? "zh-site" : "en-site"}`}>
      {!zh && <div className="en-noise" />}
      <Header locale={locale} user={user} isTeaser={isTeaser} />
      <main>{children}</main>
      <Footer locale={locale} isTeaser={isTeaser} />
    </div>
  );
}
