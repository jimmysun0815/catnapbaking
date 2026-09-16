import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Google 登录完会跳回这里，带一个 code，换成会话写进 cookie。
 * Supabase 后台 Authentication → URL Configuration 的 Redirect URLs
 * 必须包含本站地址，否则跳转会被拒。
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/zh/account";
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/zh/login?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/zh/login?error=missing_code`);
  }

  const sb = await serverClient();
  if (!sb) return NextResponse.redirect(`${origin}/zh/login?error=not_configured`);

  const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/zh/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  // 只允许跳回站内，防开放重定向
  const target = next.startsWith("/") ? next : "/zh/account";
  return NextResponse.redirect(`${origin}${target}`);
}
