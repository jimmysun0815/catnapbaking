import { cache } from "react";
import { serviceClient } from "./supabase";

/**
 * 站点模式。
 *   teaser  预热期：只讲产品，不露任何下单、库存、自取信息，收邮箱
 *   live    开业后：完整的下单流程
 *
 * 真相源在数据库的 site_settings，后台 /admin/settings 可以实时切换。
 * NEXT_PUBLIC_SITE_MODE 退化为兜底：它是构建期内联的，改了要重新部署才生效，
 * 所以不能用来做开关，只在数据库读不到时顶上。
 *
 * 读不到就用环境变量、再不行默认 live —— 保留原有语义：
 * 宁可误开店，也不要因为一次数据库抖动把店悄悄关了。
 */
export type SiteMode = "teaser" | "live";

/** 兜底值。数据库不可用时用它 */
export const envSiteMode: SiteMode =
  process.env.NEXT_PUBLIC_SITE_MODE === "teaser" ? "teaser" : "live";

/**
 * 当前模式。用 React cache 包一层，同一次请求里多个组件调用只查一次库。
 * 只能在服务端调用；客户端组件请从父级以 prop 传入。
 */
export const getSiteMode = cache(async (): Promise<SiteMode> => {
  const db = serviceClient();
  if (!db) return envSiteMode;

  const { data, error } = await db
    .from("site_settings").select("mode").eq("id", 1).maybeSingle();
  if (error || !data) return envSiteMode;

  return data.mode === "teaser" ? "teaser" : "live";
});

export async function getIsTeaser(): Promise<boolean> {
  return (await getSiteMode()) === "teaser";
}
