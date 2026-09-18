"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { generateCode } from "@/lib/coupons";

export type CouponRow = {
  id: string; code: string; kind: "percent" | "amount";
  percent_off: number | null; amount_off_cents: number | null;
  min_subtotal_cents: number; max_redemptions: number | null; redeemed_count: number;
  starts_at: string | null; expires_at: string | null;
  active: boolean; note: string | null; created_at: string;
};

/** 状态是「现在这一刻」算出来的，服务端渲染的时间和用户看到的可能差几分钟，
 *  所以在客户端按本地时间再算一次，只用于显示；真正的判定在数据库里 */
function statusOf(c: CouponRow): { label: string; cls: string } {
  if (!c.active) return { label: "已停用", cls: "pill-quiet" };
  const now = Date.now();
  if (c.starts_at && now < new Date(c.starts_at).getTime()) return { label: "未开始", cls: "pill-quiet" };
  if (c.expires_at && now >= new Date(c.expires_at).getTime()) return { label: "已过期", cls: "pill-warn" };
  if (c.max_redemptions != null && c.redeemed_count >= c.max_redemptions) {
    return { label: "已用完", cls: "pill-warn" };
  }
  return { label: "生效中", cls: "pill-paid" };
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("zh-CN") : "—";
}

/** datetime-local 需要本地时区的 "YYYY-MM-DDTHH:mm"，不能直接塞 ISO */
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CouponManager({ rows }: { rows: CouponRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [percent, setPercent] = useState("10");
  const [amount, setAmount] = useState("5.00");
  const [minSub, setMinSub] = useState("0");
  const [maxRed, setMaxRed] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  async function create() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          kind,
          percentOff: kind === "percent" ? parseInt(percent, 10) : null,
          amountOffCents: kind === "amount" ? Math.round(parseFloat(amount) * 100) : null,
          minSubtotalCents: Math.round(parseFloat(minSub || "0") * 100),
          maxRedemptions: maxRed.trim() ? parseInt(maxRed, 10) : null,
          // datetime-local 是本地时间，转成 ISO 带上时区，数据库才不会理解错
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          note: note.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "创建失败");
      setMsg(`已创建 ${d.coupon.code}`);
      setCode(""); setNote(""); setMaxRed(""); setStartsAt(""); setExpiresAt("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建失败");
    } finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "操作失败");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="coupon-toolbar">
        <button type="button" className="admin-btn" onClick={() => setOpen((v) => !v)}>
          {open ? "收起" : "+ 新建优惠券"}
        </button>
        {msg && <span className="coupon-ok">{msg}</span>}
        {err && <span className="coupon-bad">{err}</span>}
      </div>

      {open && (
        <div className="coupon-form">
          <label>
            <span>券码</span>
            <div className="coupon-row">
              <input className="field" value={code} placeholder="如 WELCOME10"
                onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button type="button" className="coupon-apply"
                onClick={() => setCode(generateCode())}>随机</button>
            </div>
          </label>

          <label>
            <span>折扣方式</span>
            <select className="field" value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "amount")}>
              <option value="percent">按比例</option>
              <option value="amount">按金额</option>
            </select>
          </label>

          {kind === "percent" ? (
            <label>
              <span>折扣比例（%）</span>
              <input className="field" inputMode="numeric" value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))} />
            </label>
          ) : (
            <label>
              <span>折扣金额（加元）</span>
              <input className="field" inputMode="decimal" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
            </label>
          )}

          <label>
            <span>最低消费（加元，0 为不限）</span>
            <input className="field" inputMode="decimal" value={minSub}
              onChange={(e) => setMinSub(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>

          <label>
            <span>使用次数上限（留空不限）</span>
            <input className="field" inputMode="numeric" value={maxRed} placeholder="不限"
              onChange={(e) => setMaxRed(e.target.value.replace(/\D/g, ""))} />
          </label>

          <label>
            <span>生效时间（留空立即）</span>
            <input className="field" type="datetime-local" value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)} />
          </label>

          <label>
            <span>过期时间（留空不过期）</span>
            <input className="field" type="datetime-local" value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)} />
            <button type="button" className="link-btn" style={{ marginTop: 6, alignSelf: "flex-start" }}
              onClick={() => setExpiresAt(toLocalInput(new Date(Date.now() + 7 * 86400_000)))}>
              设为 7 天后
            </button>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <span>备注（只有后台看得到）</span>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="variant-actions">
            <button type="button" className="admin-btn" onClick={create}
              disabled={busy || code.trim().length < 3}>
              {busy ? "创建中…" : "创建"}
            </button>
            <span className="variant-hint">
              时间按你本机时区填写，存库时转成 UTC。是否过期以数据库时间为准。
            </span>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="admin-foot-note">还没有优惠券。</p>
      ) : (
        <div className="table-scroll" style={{ marginTop: 30 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>券码</th><th>折扣</th><th className="num">门槛</th>
                <th className="num">已用 / 上限</th><th>生效</th><th>过期</th>
                <th>状态</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const st = statusOf(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ letterSpacing: ".06em" }}>{c.code}</strong>
                      {c.note && <div style={{ color: "#826b5a", fontSize: 11 }}>{c.note}</div>}
                    </td>
                    <td>{c.kind === "percent" ? `${c.percent_off}%` : formatCents(c.amount_off_cents ?? 0)}</td>
                    <td className="num">
                      {c.min_subtotal_cents ? formatCents(c.min_subtotal_cents) : "—"}
                    </td>
                    <td className="num">
                      {c.redeemed_count} / {c.max_redemptions ?? "∞"}
                    </td>
                    <td style={{ color: "#826b5a", fontSize: 12 }}>{fmt(c.starts_at)}</td>
                    <td style={{ color: "#826b5a", fontSize: 12 }}>{fmt(c.expires_at)}</td>
                    <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="link-btn" disabled={busy}
                        onClick={() => patch(c.id, { active: !c.active })}>
                        {c.active ? "停用" : "恢复"}
                      </button>
                      {c.active && (
                        <button type="button" className="link-btn" disabled={busy}
                          style={{ marginLeft: 12 }}
                          onClick={() => patch(c.id, { expireNow: true })}>
                          立即过期
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
