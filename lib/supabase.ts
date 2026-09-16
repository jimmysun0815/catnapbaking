import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 从 2026 年起把 anon / service_role 换成了
 * publishable (sb_publishable_…) / secret (sb_secret_…)，旧名年底弃用。
 * 这里优先读新名，读不到再回退到旧名，两种项目都能跑。
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const secretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 没配 Supabase 时整站跑 lib/seed.ts 的演示数据 */
export const isConfigured = Boolean(url && publishableKey);

/** 服务端写操作是否可用。只读演示数据时为 false */
export const canWrite = Boolean(url && secretKey);

export function browserClient(): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  return createClient(url, publishableKey);
}

/** 服务端专用，绕过 RLS。绝不可暴露给浏览器 */
export function serviceClient(): SupabaseClient | null {
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
