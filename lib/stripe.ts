import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripeConfigured = Boolean(key);

export function stripe(): Stripe | null {
  if (!key) return null;
  return new Stripe(key);
}

/** 名额锁定时长。与 Stripe Checkout Session 的 expires_at 保持一致 */
export const HOLD_MINUTES = 30;

/**
 * 用于在 Stripe 后台区分不同结账入口的标签。
 */
export const INTEGRATION_ID = "catnap-checkout-ttypytwp";

/**
 * 支付方式不在代码里写死。
 *
 * 原来传 payment_method_types: ["card","wechat_pay","alipay"]，有两个问题：
 *   1. 后台没开通微信/支付宝时，创建 Session 直接报错，整个结账挂掉
 *   2. 写死就关掉了 Stripe 的动态支付方式，新支付方式要改代码才能用
 *
 * 改成完全不传，由 Stripe 后台 Settings → Payment methods 决定展示哪些。
 * 微信和支付宝批下来后在后台打开即可，代码不用动。
 */
