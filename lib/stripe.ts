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
 * 结账页可用的支付方式。
 * wechat_pay 与 alipay 需在 Stripe 后台单独申请开通，
 * 未开通时把它们从数组里去掉即可，其余逻辑不变。
 */
export function paymentMethodTypes(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const extra = (process.env.STRIPE_WALLETS ?? "wechat_pay,alipay")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return ["card", ...extra] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
}
