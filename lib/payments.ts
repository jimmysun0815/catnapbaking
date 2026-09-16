import { stripeConfigured } from "./stripe";

/**
 * 支付通道开关。
 * Stripe 还没开户，所以现在走模拟支付：结账后进一个页面，
 * 手动选「支付成功」或「支付失败」，走的是和真支付完全相同的状态流转。
 *
 * 一旦配上 STRIPE_SECRET_KEY，模拟通道立刻关闭（接口直接 404），
 * 不会出现线上还能手动点成功的情况。
 */
export const mockPaymentsEnabled = !stripeConfigured;

/** 模拟支付页可选的支付方式，和真实结账页保持一致 */
export const MOCK_METHODS = ["card", "wechat_pay", "alipay"] as const;
export type MockMethod = (typeof MOCK_METHODS)[number];
