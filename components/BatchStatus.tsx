"use client";

import { useEffect, useState } from "react";

/** 截单倒计时。服务端先渲染静态文本，客户端接管后每秒更新 */
export function Countdown({
  closesAt, label, closedLabel, locale,
}: { closesAt: string; label: string; closedLabel: string; locale: "zh" | "en" }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(new Date(closesAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closesAt]);

  if (left === null) return <span className="countdown">{label}</span>;
  if (left <= 0) return <span className="countdown is-closed"><b>{closedLabel}</b></span>;

  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const parts = locale === "zh"
    ? [d && `${d} 天`, `${h} 小时`, `${m} 分`, !d && `${s} 秒`]
    : [d && `${d}d`, `${h}h`, `${m}m`, !d && `${s}s`];

  return (
    <span className="countdown">
      {label} <b>{parts.filter(Boolean).join(" ")}</b>
    </span>
  );
}

/** 本期产能条 */
export function CapacityMeter({
  taken, total, remaining, remainingLabel, pickupLabel, pickupValue,
}: {
  taken: number; total: number; remaining: number;
  remainingLabel: string; pickupLabel: string; pickupValue: string;
}) {
  const pct = Math.min(100, Math.round((taken / total) * 100));
  return (
    <div className="batch-meter">
      <div className="meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-legend">
        <span>{remainingLabel} <b>{remaining}</b> / {total}</span>
        <span>{pickupLabel} {pickupValue}</span>
      </div>
    </div>
  );
}
