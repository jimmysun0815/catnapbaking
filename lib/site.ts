/**
 * 站点地址。
 * Vercel 后台填域名时很容易漏掉 https://，而 new URL("catnapbaking.com")
 * 会直接抛 ERR_INVALID_URL 把 build 打挂，所以统一在这里补齐协议。
 */
export function normalizeSiteUrl(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/\/+$/, "");
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  // 没写协议的当线上域名处理，本地地址例外
  const scheme = /^(localhost|127\.0\.0\.1)(:|$)/.test(v) ? "http" : "https";
  return `${scheme}://${v}`;
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000";
