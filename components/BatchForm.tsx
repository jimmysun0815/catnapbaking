"use client";

import { useState } from "react";
import type { Flavour } from "@/lib/types";

/** 下周同一天的 yyyy-mm-dd / datetime-local 默认值 */
function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${iso(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function BatchForm({ flavours, dbReady }: { flavours: Flavour[]; dbReady: boolean }) {
  const now = new Date();
  const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
  const opens = new Date(sat); opens.setHours(10, 0, 0, 0);
  const closes = new Date(sat); closes.setHours(22, 0, 0, 0);
  const pickup = new Date(sat); pickup.setDate(sat.getDate() + 1);

  const [f, setF] = useState({
    name_zh: "", name_en: "",
    opens_at: isoLocal(opens), closes_at: isoLocal(closes),
    capacity_boxes: 80,
    pickup_address: "Richmond, BC（下单后邮件告知具体地址）",
    pickup_note_zh: "取货时请出示订单号。冷藏可放 5 天，室温 2 天。",
    pickup_note_en: "Show your order number at pickup. Keeps 5 days refrigerated, 2 days at room temperature.",
    pickup_date: iso(pickup),
    slot_start_hour: 14, slot_count: 3, slot_minutes: 60, slot_max_orders: 12,
    open_now: true,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, flavour_ids: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      setMsg(`批次已创建，生成了 ${data.slots} 个自取时段。`);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="batch-form">
      {!dbReady && (
        <p className="notice-box">
          数据库还没连上。填好 <code>.env.local</code> 里的 Supabase 变量、执行
          <code> supabase db push</code> 之后，这个表单才能真正写入。
        </p>
      )}

      <div className="form-grid">
        <div>
          <label className="auth-field-label" htmlFor="nz">中文名称</label>
          <input id="nz" className="field" required value={f.name_zh}
            placeholder="本周批次 · 经典巧克力曲奇"
            onChange={(e) => set("name_zh", e.target.value)} />
        </div>
        <div>
          <label className="auth-field-label" htmlFor="ne">英文名称</label>
          <input id="ne" className="field" required value={f.name_en}
            placeholder="This Week's Drop · Classic Chocolate Chip"
            onChange={(e) => set("name_en", e.target.value)} />
        </div>

        <div>
          <label className="auth-field-label" htmlFor="oa">开单时间</label>
          <input id="oa" className="field" type="datetime-local" required value={f.opens_at}
            onChange={(e) => set("opens_at", e.target.value)} />
        </div>
        <div>
          <label className="auth-field-label" htmlFor="ca">截单时间</label>
          <input id="ca" className="field" type="datetime-local" required value={f.closes_at}
            onChange={(e) => set("closes_at", e.target.value)} />
        </div>

        <div>
          <label className="auth-field-label" htmlFor="cap">总产能（盒）</label>
          <input id="cap" className="field" type="number" min={1} required value={f.capacity_boxes}
            onChange={(e) => set("capacity_boxes", Number(e.target.value))} />
        </div>
        <div>
          <label className="auth-field-label" htmlFor="pd">自取日期</label>
          <input id="pd" className="field" type="date" required value={f.pickup_date}
            onChange={(e) => set("pickup_date", e.target.value)} />
        </div>

        <div className="form-wide">
          <label className="auth-field-label" htmlFor="pa">自取地点</label>
          <input id="pa" className="field" required value={f.pickup_address}
            onChange={(e) => set("pickup_address", e.target.value)} />
        </div>
      </div>

      <fieldset className="form-block">
        <legend className="auth-field-label">自取时段（按下面的参数自动生成）</legend>
        <div className="form-grid form-grid-4">
          <div>
            <label className="auth-field-label" htmlFor="sh">起始整点</label>
            <input id="sh" className="field" type="number" min={0} max={23} value={f.slot_start_hour}
              onChange={(e) => set("slot_start_hour", Number(e.target.value))} />
          </div>
          <div>
            <label className="auth-field-label" htmlFor="sc">段数</label>
            <input id="sc" className="field" type="number" min={1} max={12} value={f.slot_count}
              onChange={(e) => set("slot_count", Number(e.target.value))} />
          </div>
          <div>
            <label className="auth-field-label" htmlFor="sm">每段分钟</label>
            <input id="sm" className="field" type="number" min={15} max={240} step={15} value={f.slot_minutes}
              onChange={(e) => set("slot_minutes", Number(e.target.value))} />
          </div>
          <div>
            <label className="auth-field-label" htmlFor="smo">每段上限（单）</label>
            <input id="smo" className="field" type="number" min={1} value={f.slot_max_orders}
              onChange={(e) => set("slot_max_orders", Number(e.target.value))} />
          </div>
        </div>
        <p className="admin-sub" style={{ marginTop: 10 }}>
          例：起始 14、3 段、每段 60 分钟 → 14:00–15:00、15:00–16:00、16:00–17:00
        </p>
      </fieldset>

      {flavours.length > 0 && (
        <fieldset className="form-block">
          <legend className="auth-field-label">本期供应口味</legend>
          <div className="chip-row">
            {flavours.map((fl) => {
              const on = picked.includes(fl.id);
              return (
                <button key={fl.id} type="button"
                  className={`pay-method ${on ? "is-on" : ""}`}
                  onClick={() => setPicked((p) => on ? p.filter((x) => x !== fl.id) : [...p, fl.id])}>
                  {fl.name_zh}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <label className="check-row">
        <input type="checkbox" checked={f.open_now}
          onChange={(e) => set("open_now", e.target.checked)} />
        <span>创建后立即开放下单（不勾则存为草稿）</span>
      </label>

      <button type="submit" className="summary-cta" disabled={busy} style={{ maxWidth: 260 }}>
        {busy ? "创建中…" : "创建批次"}
      </button>

      {msg && <p className="notice-box" style={{ marginTop: 16 }}>{msg}</p>}
      {err && <p className="alert">{err}</p>}
    </form>
  );
}
