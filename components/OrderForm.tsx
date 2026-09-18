"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { Batch, Flavour, Locale, Product } from "@/lib/types";

type Props = {
  locale: Locale;
  batch: Batch;
  product: Product;
  flavours: Flavour[];
  prices: Record<string, number>;
  signedIn?: boolean;
  prefill?: { name: string; phone: string; email: string };
  t: {
    subtotal: string; pickTime: string; slotFull: string;
    checkout: string; soldOut: string; gstNote: string;
  };
};

export function OrderForm({ locale, batch, product, flavours, prices, t, signedIn = false, prefill }: Props) {
  const zh = locale === "zh";
  const [qty, setQty] = useState<Record<string, number>>({});
  const [flavourFor, setFlavourFor] = useState<Record<string, string>>({});
  const [slotId, setSlotId] = useState("");
  // Stripe 缺席，联系方式改由我们自己收；接入后可改回由结账页收集
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [gift, setGift] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<
    { ok: boolean; message: string; discount: number } | null
  >(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const remaining = Math.max(0, batch.capacity_boxes - batch.boxes_taken);
  const boxes = Object.values(qty).reduce((a, b) => a + b, 0);
  const subtotal = product.variants.reduce(
    (sum, v) => sum + (qty[v.id] ?? 0) * (prices[v.id] ?? v.price_cents), 0
  );
  const overCapacity = boxes > remaining;
  const contactOk = name.trim().length > 0 && phone.trim().length >= 6 && /.+@.+\..+/.test(email);
  const canSubmit = boxes > 0 && !!slotId && contactOk && !overCapacity && !busy;

  const fmtTime = useMemo(
    () => (iso: string) =>
      new Date(iso).toLocaleTimeString(zh ? "zh-CN" : "en-CA",
        { hour: "2-digit", minute: "2-digit", hour12: !zh }),
    [zh]
  );
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(zh ? "zh-CN" : "en-CA",
      { month: "short", day: "numeric", weekday: "short" });

  function bump(id: string, delta: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
    // 数量一变，门槛和折扣都可能不同，之前的校验结果作废
    setCouponState(null);
  }

  const cartItems = () => product.variants
    .filter((v) => (qty[v.id] ?? 0) > 0)
    .map((v) => ({ variantId: v.id, quantity: qty[v.id] }));

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code || boxes === 0) return;
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupon/preview", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, items: cartItems() }),
      });
      const d = await res.json();
      setCouponState({ ok: !!d.ok, message: d.message ?? "", discount: d.discount ?? 0 });
    } catch {
      setCouponState({ ok: false, message: zh ? "校验失败，请重试" : "Could not check the code", discount: 0 });
    } finally {
      setCouponBusy(false);
    }
  }

  async function checkout() {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale, batchId: batch.id, slotId,
          contact: { name: name.trim(), phone: phone.trim(), email: email.trim(), giftMessage: gift.trim() || null },
          couponCode: couponState?.ok ? coupon.trim() : null,
          items: product.variants
            .filter((v) => (qty[v.id] ?? 0) > 0)
            .map((v) => ({
              variantId: v.id,
              quantity: qty[v.id],
              flavourId: flavourFor[v.id] ?? batch.flavour_ids[0] ?? null,
            })),
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data.loginRequired) {
        const back = encodeURIComponent(`/${locale}/order`);
        window.location.href = `/${locale}/login?next=${back}`;
        return;
      }
      if (res.status === 409 && data.error === "coupon_rejected") {
        setCouponState({ ok: false, message: data.message, discount: 0 });
        setError(data.message);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "checkout failed");
      if (data.url) window.location.href = data.url;
      else setNotice(data.message ?? (zh ? "暂时无法结账" : "Checkout unavailable"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (remaining <= 0) {
    return <p className="notice-box">{t.soldOut}</p>;
  }

  return (
    <div className="order-grid">
      <div>
        {/* 规格与数量 */}
        <div className="variant-list">
          {product.variants.map((v) => {
            const price = prices[v.id] ?? v.price_cents;
            const n = qty[v.id] ?? 0;
            return (
              <div key={v.id} className="variant-row">
                <div className="variant-head">
                  <div>
                    <div className="variant-name">{zh ? v.name_zh : v.name_en}</div>
                    <div className="variant-sub">
                      {zh ? `每盒 ${v.cookie_count} 块` : `${v.cookie_count} cookies`}
                    </div>
                  </div>
                  <div className="variant-controls">
                    <span className="variant-price">{formatCents(price, locale)}</span>
                    <div className="stepper">
                      <button type="button" onClick={() => bump(v.id, -1)} disabled={n === 0}
                        aria-label={zh ? "减少" : "Decrease"}>
                        <Minus size={13} />
                      </button>
                      <output>{n}</output>
                      <button type="button" onClick={() => bump(v.id, 1)}
                        aria-label={zh ? "增加" : "Increase"}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 口味选择只在后台把模式设成 single / mix 时出现 */}
                {product.flavour_mode !== "none" && n > 0 && (
                  <div className="flavour-picker">
                    <label htmlFor={`fl-${v.id}`}>{zh ? "口味" : "Flavour"}</label>
                    <select id={`fl-${v.id}`} className="field"
                      value={flavourFor[v.id] ?? ""}
                      onChange={(e) => setFlavourFor((f) => ({ ...f, [v.id]: e.target.value }))}>
                      <option value="">{zh ? "请选择" : "Select…"}</option>
                      {flavours.filter((f) => batch.flavour_ids.includes(f.id)).map((f) => (
                        <option key={f.id} value={f.id}>{zh ? f.name_zh : f.name_en}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 自取时段 */}
        <fieldset style={{ border: 0, margin: "44px 0 0", padding: 0 }}>
          <legend className="slot-legend">{t.pickTime}</legend>
          <div className="slot-grid">
            {batch.slots.map((s) => {
              const full = s.orders_taken >= s.max_orders;
              const selected = slotId === s.id;
              return (
                <label key={s.id}
                  className={`slot ${selected ? "slot-selected" : ""} ${full ? "slot-full" : ""}`}>
                  <input type="radio" name="slot" value={s.id} disabled={full}
                    checked={selected} onChange={() => setSlotId(s.id)}
                    style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
                  <span className="slot-day">{fmtDay(s.starts_at)}</span>
                  <span className="slot-time">{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</span>
                  <span className="slot-left">
                    {full ? t.slotFull
                      : zh ? `余 ${s.max_orders - s.orders_taken} 位`
                      : `${s.max_orders - s.orders_taken} left`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 联系方式：没有 Stripe 结账页代收，只能自己问 */}
        <fieldset style={{ border: 0, margin: "44px 0 0", padding: 0 }}>
          <legend className="slot-legend">{zh ? "取货联系人" : "Who's picking up"}</legend>
          <div className="contact-grid">
            <div>
              <label className="auth-field-label" htmlFor="c-name">{zh ? "姓名" : "Name"}</label>
              <input id="c-name" className="field" value={name} autoComplete="name"
                onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="auth-field-label" htmlFor="c-phone">{zh ? "手机" : "Phone"}</label>
              <input id="c-phone" className="field" value={phone} inputMode="tel" autoComplete="tel"
                onChange={(e) => setPhone(e.target.value)} placeholder="604-555-0100" />
            </div>
            <div className="contact-wide">
              <label className="auth-field-label" htmlFor="c-email">{zh ? "邮箱（收据和取货提醒发这里）" : "Email (receipt and pickup reminder)"}</label>
              <input id="c-email" className="field" value={email} type="email" autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="contact-wide">
              <label className="auth-field-label" htmlFor="c-gift">{zh ? "礼品留言（选填）" : "Gift message (optional)"}</label>
              <input id="c-gift" className="field" value={gift} maxLength={200}
                onChange={(e) => setGift(e.target.value)} />
            </div>
          </div>
        </fieldset>
      </div>

      {/* 结算 */}
      <aside className="summary">
        <div className="coupon-box">
          <label htmlFor="coupon">{zh ? "优惠码" : "Promo code"}</label>
          <div className="coupon-row">
            <input id="coupon" className="field" value={coupon} autoComplete="off"
              placeholder={zh ? "有就填，没有留空" : "Optional"}
              onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponState(null); }} />
            <button type="button" className="coupon-apply"
              onClick={applyCoupon} disabled={!coupon.trim() || boxes === 0 || couponBusy}>
              {couponBusy ? (zh ? "校验中" : "Checking") : (zh ? "应用" : "Apply")}
            </button>
          </div>
          {couponState && (
            <p className={couponState.ok ? "coupon-ok" : "coupon-bad"}>
              {couponState.ok
                ? `${couponState.message} −${formatCents(couponState.discount, locale)}`
                : couponState.message}
            </p>
          )}
        </div>

        {couponState?.ok && couponState.discount > 0 && (
          <div className="summary-line">
            <span>{zh ? "小计" : "Subtotal"}</span>
            <span>{formatCents(subtotal, locale)}</span>
          </div>
        )}
        {couponState?.ok && couponState.discount > 0 && (
          <div className="summary-line summary-line-off">
            <span>{zh ? "优惠" : "Discount"}</span>
            <span>−{formatCents(couponState.discount, locale)}</span>
          </div>
        )}

        <div className="summary-total">
          <span>{couponState?.ok && couponState.discount > 0 ? (zh ? "应付" : "Total") : t.subtotal}</span>
          <strong>
            {formatCents(
              couponState?.ok ? Math.max(subtotal - couponState.discount, 0) : subtotal,
              locale
            )}
          </strong>
        </div>
        <div className="summary-meta">
          {zh ? `${boxes} 盒 · 本期剩余 ${remaining} 盒` : `${boxes} boxes · ${remaining} left this drop`}
        </div>

        {overCapacity && (
          <p className="alert">
            {zh ? `本期只剩 ${remaining} 盒，请减少数量。` : `Only ${remaining} boxes left this drop.`}
          </p>
        )}

        <button type="button" className="summary-cta" onClick={checkout} disabled={!canSubmit}>
          {busy ? (zh ? "处理中…" : "Working…")
            : signedIn ? t.checkout
            : zh ? "登录并结账" : "Sign in & check out"}
        </button>

        {!signedIn && (
          <p className="summary-note" style={{ borderTop: 0, marginTop: 12, paddingTop: 0 }}>
            {zh
              ? "结账前需要登录，收据和取货提醒才发得到你。"
              : "You'll sign in before paying, so the receipt and pickup reminder reach you."}
          </p>
        )}

        {boxes > 0 && !!slotId && !contactOk && (
          <p className="summary-meta" style={{ marginTop: 10 }}>
            {zh ? "填好姓名、手机和邮箱就可以结账" : "Add your name, phone and email to check out"}
          </p>
        )}

        {error && <p className="alert">{error}</p>}
        {notice && <p className="summary-note" style={{ borderTop: 0, paddingTop: 12 }}>{notice}</p>}

        <p className="summary-note">
          {zh
            ? "结账页支持信用卡、微信支付、支付宝。名额在结账时锁定 30 分钟，未付款自动释放。"
            : "Card, WeChat Pay and Alipay at checkout. Your spot is held for 30 minutes."}
          <br />{t.gstNote}
        </p>
      </aside>
    </div>
  );
}
