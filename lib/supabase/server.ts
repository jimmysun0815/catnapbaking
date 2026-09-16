import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 服务端读登录态用。走顾客自己的身份，受行级权限约束，
 * 和 serviceClient（绕过 RLS 的写入客户端）是两回事，别搞混。
 */
export async function serverClient(): Promise<SupabaseClient | null> {
  if (!url || !publishableKey) return null;
  const store = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // 在 Server Component 里改 cookie 会抛错，交给 middleware 刷新即可
        }
      },
    },
  });
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  isAdmin: boolean;
  locale: "zh" | "en";
  marketingOptIn: boolean;
};

/** 取当前登录用户，未登录返回 null */
export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await serverClient();
  if (!sb) return null;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, phone, is_admin, locale, marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    phone: profile?.phone ?? null,
    isAdmin: profile?.is_admin ?? false,
    locale: (profile?.locale as "zh" | "en") ?? "zh",
    marketingOptIn: profile?.marketing_opt_in ?? false,
  };
}
