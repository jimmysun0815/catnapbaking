import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { PageShell } from "@/components/PageShell";
import type { Locale } from "@/lib/types";
import { getIsTeaser } from "@/lib/site-mode";

export default async function LoginPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  // 预热期顾客不需要登录，但管理员要能进后台，所以 next 指向 /admin 时放行
  const { next } = await searchParams;
  const forAdmin = typeof next === "string" && next.startsWith("/admin");
  if ((await getIsTeaser()) && !forAdmin) redirect(`/${locale}`);
  return <PageShell locale={locale}><LoginForm locale={locale} /></PageShell>;
}
