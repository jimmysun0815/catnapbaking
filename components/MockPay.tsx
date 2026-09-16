"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { Locale } from "@/lib/types";

type Line = { name: string; quantity: number; unit_price_cents: number };

/**
 * 支付通道的占位。Stripe 开户后整个页面删掉即可，
 * 结账接口会自动改为跳转 Stripe，订单状态流转逻辑不用动。
 */
export function MockPay({
  locale, orderNo, total, lines, pickup,
}: {
  locale: Locale; orderNo: string; total: number;
  lines: Line[]; pickup: string | null;
}) {
  const zh = locale === "zh";
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState<null | "success" | "failure">(null);
  const [error, setError] = useState<string | null>(null);

  const METHODS = [
    { id: "card", zh: "信用卡", en: "Card" },
    { id: "wechat_pay", zh: "微信支付", en: "WeChat Pay" },
    { id: "alipay", zh: "支付宝", en: "Alipay" },
  ];

  async function settle(outcome: "success" | "failure") {
    setBusy(outcome); setError(null);
    try {
      const res = await fetch("/api/mock-pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNo, outcome, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      window.location.href = outcome === "success"
        ? `/${locale}/success?order=${orderNo}`
        : `/${locale}/order?failed=${orderNo}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  return (
    <section className="auth-shell">
      <div className="section-index">{zh ? "支付" : "payment"}</div>
      <h1>{zh ? "确认付款" : "Confirm payment"}</h1>

      <p className="notice-box" style={{ marginTop: 20 }}>
        {zh
          ? "这是支付通道的占位。Stripe 开户后这一步会跳转到真实结账页，下面两个按钮会消失。"
          : "This stands in for the payment gateway. Once Stripe is live this step opens the real checkout and these buttons disappear."}
      </p>

      <div className="pay-summary">
        <div className="pay-row"><span>{zh ? "订单号" : "Order"}</span><b>{orderNo}</b></div>
        {lines.map((l, i) => (
          <div className="pay-row" key={i}>
            <span>{l.name} × {l.quantity}</span>
            <b>{formatCents(l.unit_price_cents * l.quantity, locale)}</b>
          </div>
        ))}
        {pickup && <div className="pay-row"><span>{zh ? "自取" : "Pickup"}</span><b>{pickup}</b></div>}
        <div className="pay-row pay-total">
          <span>{zh ? "应付" : "Total"}</span>
          <b>{formatCents(total, locale)}</b>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <label className="auth-field-label">{zh ? "支付方式" : "Payment method"}</label>
        <div className="pay-methods">
          {METHODS.map((m) => (
            <button key={m.id} type="button"
              className={`pay-method ${method === m.id ? "is-on" : ""}`}
              onClick={() => setMethod(m.id)}>
              {zh ? m.zh : m.en}
            </button>
          ))}
        </div>
      </div>

      <div className="pay-actions">
        <button type="button" className="pay-ok" disabled={!!busy} onClick={() => settle("success")}>
          <Check size={16} /> {busy === "success" ? (zh ? "处理中…" : "Working…") : zh ? "模拟支付成功" : "Simulate success"}
        </button>
        <button type="button" className="pay-fail" disabled={!!busy} onClick={() => settle("failure")}>
          <X size={16} /> {busy === "failure" ? (zh ? "处理中…" : "Working…") : zh ? "模拟支付失败" : "Simulate failure"}
        </button>
      </div>

      {error && <p className="alert">{error}</p>}

      <p className="auth-foot">
        {zh
          ? "选「成功」会把订单标记为已付款、扣减名额并发出收据邮件；选「失败」会释放名额，别人可以买走这一份。"
          : "Success marks the order paid, holds the capacity and sends the receipt. Failure releases the spot back to the drop."}
      </p>
    </section>
  );
}
