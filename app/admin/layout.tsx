import Image from "next/image";
import Link from "next/link";
import "../globals.css";

const NAV = [
  { href: "/admin", label: "看板" },
  { href: "/admin/waitlist", label: "候补名单" },
  { href: "/admin/batches", label: "批次" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/bake", label: "烘焙清单" },
  { href: "/admin/products", label: "商品与价格" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="zh-CN" className="admin">
      <header className="admin-nav">
        <span className="admin-brand">
          <Image src="/brand/cat-nap-mark-128.png" alt="" width={26} height={26} className="admin-mark" />
          不太甜研究所
        </span>
        <span className="eyebrow">后台</span>
        <nav>
          {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          <Link href="/zh" style={{ opacity: .5 }}>看前台 →</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
