"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * 后台左侧导航。
 * 分组是按使用频率排的：日常盯单在上，配置类在下。
 */
const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "经营",
    items: [
      { href: "/admin", label: "看板" },
      { href: "/admin/orders", label: "订单" },
      { href: "/admin/bake", label: "烘焙清单" },
    ],
  },
  {
    title: "顾客",
    items: [
      { href: "/admin/waitlist", label: "候补名单" },
      { href: "/admin/campaigns", label: "邮件群发" },
    ],
  },
  {
    title: "配置",
    items: [
      { href: "/admin/batches", label: "批次" },
      { href: "/admin/products", label: "商品与价格" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // /admin 是所有后台页的前缀，精确匹配才算选中，否则它会一直高亮
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        className="admin-burger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "收起菜单" : "展开菜单"}
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside className={`admin-side ${open ? "admin-side-open" : ""}`}>
        <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}>
          <Image
            src="/brand/cat-nap-mark-128.png"
            alt=""
            width={26}
            height={26}
            className="admin-mark"
          />
          <span>
            不太甜研究所
            <small>后台</small>
          </span>
        </Link>

        <nav>
          {GROUPS.map((g) => (
            <div key={g.title} className="admin-side-group">
              <div className="admin-side-title">{g.title}</div>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={isActive(it.href) ? "is-active" : ""}
                  aria-current={isActive(it.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <Link href="/zh" className="admin-side-out">看前台 →</Link>
      </aside>

      {open && <div className="admin-side-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}
