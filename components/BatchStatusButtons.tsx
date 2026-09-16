"use client";

import { useState } from "react";

/** 开单 / 截单 / 完成。前台只认 status = open 的批次 */
export function BatchStatusButtons({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.ok) window.location.reload();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  const next =
    status === "draft" ? { label: "开单", value: "open" }
    : status === "open" ? { label: "截单", value: "closed" }
    : status === "closed" ? { label: "标记完成", value: "completed" }
    : null;

  if (!next) return <span style={{ color: "#826b5a", fontSize: 12 }}>—</span>;

  return (
    <button type="button" className="pay-method" disabled={busy} onClick={() => set(next.value)}>
      {busy ? "…" : next.label}
    </button>
  );
}
