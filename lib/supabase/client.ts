"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 浏览器端。登录态存在 cookie 里，服务端才读得到 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  return createBrowserClient(url, publishableKey);
}
