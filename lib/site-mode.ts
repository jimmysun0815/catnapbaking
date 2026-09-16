/**
 * 站点模式。
 *   teaser  预热期：只讲产品，不露任何下单、库存、自取信息，收邮箱
 *   live    开业后：完整的下单流程
 *
 * 开业当天把环境变量改成 live 重新部署即可，代码不用动。
 * 不设时默认 live，避免哪天忘了配变量就悄悄把店关了。
 */
export type SiteMode = "teaser" | "live";

export const siteMode: SiteMode =
  process.env.NEXT_PUBLIC_SITE_MODE === "teaser" ? "teaser" : "live";

export const isTeaser = siteMode === "teaser";
