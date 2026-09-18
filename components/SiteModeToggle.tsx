"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SiteMode } from "@/lib/site-mode";

const COPY: Record<SiteMode, { label: string; desc: string }> = {
  teaser: {
    label: "预热模式",
    desc: "只讲产品。隐藏剩余数量、倒计时、口味卡、取货时段与自取地点，下单和登录入口关闭，/order、/pay、/account 重定向回首页，结账接口直接返回 404。首页底部收邮箱。",
  },
  live: {
    label: "正式运营",
    desc: "完整下单流程。上述内容全部恢复显示，顾客可以登录、下单、选自取时段。",
  },
};

/**
 * 切到 live 是对外可见的动作（顾客立刻能下单），所以要二次确认。
 * 切回 teaser 相对安全，直接切。
 */
export function SiteModeToggle({ current }: { current: SiteMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const target: SiteMode = current === "teaser" ? "live" : "teaser";

  async function apply(mode: SiteMode) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/site-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "切换失败");
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "切换失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mode-panel">
      <div className="mode-cards">
        {(["teaser", "live"] as SiteMode[]).map((m) => (
          <div key={m} className={`mode-card ${m === current ? "is-current" : ""}`}>
            <div className="mode-card-head">
              <strong>{COPY[m].label}</strong>
              {m === current && <span className="pill pill-paid">当前</span>}
            </div>
            <p>{COPY[m].desc}</p>
          </div>
        ))}
      </div>

      <div className="mode-actions">
        {target === "live" ? (
          confirming ? (
            <>
              <span className="mode-warn">
                切换后顾客立刻可以下单。确认批次、价格、自取时段都已就绪？
              </span>
              <button type="button" className="admin-btn admin-btn-danger"
                onClick={() => apply("live")} disabled={busy}>
                {busy ? "切换中…" : "确认开业"}
              </button>
              <button type="button" className="link-btn"
                onClick={() => setConfirming(false)} disabled={busy}>取消</button>
            </>
          ) : (
            <button type="button" className="admin-btn" onClick={() => setConfirming(true)}>
              切到正式运营 →
            </button>
          )
        ) : (
          <button type="button" className="admin-btn" onClick={() => apply("teaser")} disabled={busy}>
            {busy ? "切换中…" : "← 切回预热模式"}
          </button>
        )}
      </div>

      {err && <p className="variant-msg" style={{ marginTop: 12 }}>{err}</p>}
    </section>
  );
}
