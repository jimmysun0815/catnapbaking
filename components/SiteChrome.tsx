"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLockup } from "./BrandMark";
import { content } from "@/lib/content";
import { isTeaser } from "@/lib/site-mode";
import type { Locale } from "@/lib/types";

const ZH_NAV = [
  { href: "#why", label: "为什么不太甜" },
  { href: "#lineup", label: "本期口味" },
  { href: "#ritual", label: "我们的方式" },
  { href: "#pickup", label: "取货方式" },
];
const EN_NAV = [
  { href: "#story", label: "Our story" },
  { href: "#menu", label: "The menu" },
  { href: "#ritual", label: "How we bake" },
  { href: "#visit", label: "Find us" },
];

// 预热期只留讲产品的锚点，口味和取货都还没定
const ZH_NAV_TEASER = [
  { href: "#why", label: "为什么不太甜" },
  { href: "#ritual", label: "我们的方式" },
  { href: "#notify", label: "开业通知" },
];
const EN_NAV_TEASER = [
  { href: "#story", label: "Our story" },
  { href: "#story2", label: "What goes in" },
  { href: "#notify", label: "Notify me" },
];

export type NavUser = { name: string | null; email: string; isAdmin: boolean } | null;

export function Header({
  locale, anchors = false, user = null,
}: { locale: Locale; anchors?: boolean; user?: NavUser }) {
  const [open, setOpen] = useState(false);
  const zh = locale === "zh";
  const t = content(locale);
  const other: Locale = zh ? "en" : "zh";
  const links = isTeaser ? (zh ? ZH_NAV_TEASER : EN_NAV_TEASER) : (zh ? ZH_NAV : EN_NAV);

  return (
    <>
      {/* 页脚「回到顶部」的锚点。不能挂在 header 上：header 是 sticky，
          永远停在视口顶部，跳转到它等于原地不动。 */}
      <span id="top" className="top-anchor" aria-hidden="true" />
    <header className={`nav ${zh ? "zh-nav" : "en-nav"}`}>
      <BrandLockup locale={locale} tone={zh ? "cream" : "ink"} />

      <nav className={open ? "mobile-open" : ""}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={anchors ? l.href : `/${locale}${l.href}`}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {/* 桌面端导航只放 4 个章节锚点，多了会挤爆；这两项收进移动菜单和页脚 */}
        <Link href={`/${locale}/faq`} className="nav-extra" onClick={() => setOpen(false)}>{t.nav.faq}</Link>
        {!isTeaser && (
          <Link href={`/${locale}/account`} className="nav-extra" onClick={() => setOpen(false)}>{t.nav.account}</Link>
        )}
      </nav>

      <div className="nav-actions">
        {isTeaser ? null : user ? (
          <div className="nav-user">
            <Link href={`/${locale}/account`} title={user.email}>
              {user.name || user.email.split("@")[0]}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="nav-signout">{zh ? "退出" : "Sign out"}</button>
            </form>
          </div>
        ) : (
          <Link href={`/${locale}/login`} className="nav-user-link">{t.nav.login}</Link>
        )}

        <div className="language-toggle" role="group" aria-label="Language">
          <Link href={`/${locale}`} className="active" aria-current="true">{zh ? "中文" : "EN"}</Link>
          <span>/</span>
          <Link href={`/${other}`}>{zh ? "EN" : "中文"}</Link>
        </div>

        {isTeaser ? (
          <a href="#notify" className={`order-button ${zh ? "" : "order-button-dark"}`}>
            {zh ? "订阅开业通知" : "Notify me"}
            <ArrowUpRight size={16} strokeWidth={1.8} />
          </a>
        ) : (
          <Link href={`/${locale}/order`} className={`order-button ${zh ? "" : "order-button-dark"}`}>
            {zh ? "预订本周曲奇" : "Reserve a box"}
            <ArrowUpRight size={16} strokeWidth={1.8} />
          </Link>
        )}

        <button className="menu-button" onClick={() => setOpen((v) => !v)} aria-label={zh ? "打开菜单" : "Open menu"}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
    </>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const t = content(locale);
  return (
    <footer className={`footer ${zh ? "zh-footer" : "en-footer"}`}>
      <BrandLockup locale={locale} tone={zh ? "cream" : "ink"} />
      <span>{t.footer.company} · {t.footer.location}</span>
      <Link href={`/${locale}/faq`}>{t.nav.faq}</Link>
      {!isTeaser && <Link href={`/${locale}/account`}>{t.nav.account}</Link>}
      <a href="mailto:hello@catnapbaking.ca">hello@catnapbaking.ca</a>
      <span>{t.footer.nutritionNote}</span>
      <a href="#top" className="back-top">{zh ? "回到顶部 ↑" : "Back to top ↑"}</a>
    </footer>
  );
}
