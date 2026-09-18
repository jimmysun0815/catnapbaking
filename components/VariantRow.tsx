"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import type { Variant } from "@/lib/types";

/**
 * 一行规格，点「编辑」原地展开成表单。
 * 价格在界面上用「元」，存库用「分」，转换只在这一处做。
 */
export function VariantRow({
  variant, actualCents,
}: { variant: Variant; actualCents: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [nameZh, setNameZh] = useState(variant.name_zh);
  const [nameEn, setNameEn] = useState(variant.name_en);
  const [count, setCount] = useState(String(variant.cookie_count));
  const [dollars, setDollars] = useState((variant.price_cents / 100).toFixed(2));
  const [active, setActive] = useState(variant.active ?? true);

  const promo = actualCents !== variant.price_cents;

  function reset() {
    setNameZh(variant.name_zh);
    setNameEn(variant.name_en);
    setCount(String(variant.cookie_count));
    setDollars((variant.price_cents / 100).toFixed(2));
    setActive(variant.active ?? true);
    setMsg(null);
    setEditing(false);
  }

  async function save() {
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) { setMsg("价格填写有误"); return; }
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1) { setMsg("每盒块数填写有误"); return; }

    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/variants", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: variant.id, name_zh: nameZh.trim(), name_en: nameEn.trim(),
          cookie_count: n, price_cents: cents, active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      if (data.warning) { setMsg(data.warning); setBusy(false); return; }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr>
        <td>
          {variant.name_zh}
          {active ? null : <span className="pill pill-quiet" style={{ marginLeft: 8 }}>已下架</span>}
        </td>
        <td style={{ color: "#826b5a", fontSize: 12 }}>{variant.sku}</td>
        <td className="num">{variant.cookie_count}</td>
        <td className="num">{formatCents(variant.price_cents)}</td>
        <td className="num" style={promo ? { color: "#b65f3e" } : undefined}>
          {formatCents(actualCents)}{promo && " ·活动价"}
        </td>
        <td className="num">
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>编辑</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="row-editing">
      <td colSpan={6}>
        <div className="variant-form">
          <label>
            <span>规格名（中）</span>
            <input className="field" value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </label>
          <label>
            <span>规格名（英）</span>
            <input className="field" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </label>
          <label>
            <span>每盒块数</span>
            <input className="field" inputMode="numeric" value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label>
            <span>常规价（加元）</span>
            <input className="field" inputMode="decimal" value={dollars}
              onChange={(e) => setDollars(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
          <label className="variant-check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>上架中（取消勾选则前台不再显示）</span>
          </label>

          <div className="variant-actions">
            <button type="button" className="admin-btn" onClick={save} disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </button>
            <button type="button" className="link-btn" onClick={reset} disabled={busy}>取消</button>
            {variant.price_cents !== Math.round(parseFloat(dollars || "0") * 100) && (
              <span className="variant-hint">
                改价后只影响新订单，已下单的保留原价
              </span>
            )}
          </div>
          {msg && <p className="variant-msg">{msg}</p>}
        </div>
      </td>
    </tr>
  );
}
