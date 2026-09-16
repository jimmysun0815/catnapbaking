/** 金额一律以「分」为单位存储和计算，避免浮点误差 */
export function formatCents(cents: number, locale: "zh" | "en" = "zh"): string {
  const dollars = cents / 100;
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Stripe 加拿大费率：2.9% + $0.30 */
export function stripeFeeCents(totalCents: number): number {
  return Math.round(totalCents * 0.029) + 30;
}
