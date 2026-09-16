import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./supabase/server";
import { isConfigured } from "./supabase";

/**
 * 后台准入。必须是登录用户，且 profiles.is_admin = true。
 *
 * 注意：后台页面用的是 serviceClient，它绕过行级权限，
 * 所以数据库那层的 RLS 在这里保护不到，必须在进页面前就拦住。
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  // 没接 Supabase 时（本地演示）放行，否则本地根本进不去后台
  if (!isConfigured) return null;

  const user = await getSessionUser();
  if (!user) redirect("/zh/login?next=%2Fadmin");
  if (!user.isAdmin) redirect("/zh/no-access");
  return user;
}

/** 接口版：不跳转，返回是否放行 */
export async function isAdminRequest(): Promise<boolean> {
  if (!isConfigured) return true;
  const user = await getSessionUser();
  return !!user?.isAdmin;
}
