"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Counts = { all: number; zh: number; en: number };

/**
 * 群发撰写。
 * 群发是不可撤销的，所以正式发送前强制两步：先试发到自己邮箱，再手动打勾确认。
 */
export function CampaignComposer({
  counts, blockers,
}: { counts: Counts; blockers: string[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [locale, setLocale] = useState<"all" | "zh" | "en">("all");
  const [testTo, setTestTo] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<null | "test" | "send">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const blocked = blockers.length > 0;
  const target = counts[locale];
  const ready = subject.trim().length > 0 && body.trim().length > 0 && !blocked;

  async function post(payload: Record<string, unknown>, kind: "test" | "send") {
    setBusy(kind); setMsg(null); setErr(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "失败");
      if (kind === "test") {
        setMsg(`试发已送出到 ${testTo}，去收件箱确认排版和退订链接。`);
      } else {
        setMsg(`群发完成：成功 ${data.sent} 封，失败 ${data.failed} 封。`);
        if (data.errors?.length) setErr(`部分失败：${data.errors.join(" | ")}`);
        setSubject(""); setBody(""); setConfirmed(false);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      {blocked && (
        <div className="admin-alert">
          <strong>还不能群发：</strong>
          <ul>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}

      <div className="campaign-form">
        <label>
          <span>收件范围</span>
          <select
            className="field"
            value={locale}
            onChange={(e) => { setLocale(e.target.value as typeof locale); setConfirmed(false); }}
          >
            <option value="all">全部（{counts.all} 人）</option>
            <option value="zh">仅中文（{counts.zh} 人）</option>
            <option value="en">仅英文（{counts.en} 人）</option>
          </select>
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          <span>主题</span>
          <input
            className="field"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setConfirmed(false); }}
            placeholder="例：第一炉出炉了，本周六开单"
          />
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          <span>正文（空行分段）</span>
          <textarea
            className="field"
            rows={10}
            value={body}
            onChange={(e) => { setBody(e.target.value); setConfirmed(false); }}
            placeholder={"我们开张了。\n\n第一批共 40 盒，本周六上午 10 点开单，售完即止。"}
          />
        </label>
      </div>

      <p className="admin-foot-note" style={{ marginTop: 24 }}>
        每封邮件都会自动附上发件主体、实体地址和退订链接 —— 这三样是 CASL 的强制要求，
        不在正文里重复写。
      </p>

      <div className="campaign-send">
        <div className="campaign-step">
          <div className="campaign-step-no">1</div>
          <div>
            <div className="campaign-step-title">先试发给自己</div>
            <div className="campaign-row">
              <input
                className="field"
                style={{ maxWidth: 280 }}
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
              />
              <button
                type="button"
                className="admin-btn"
                disabled={!ready || !testTo.includes("@") || busy !== null}
                onClick={() => post({ subject, body, locale, testTo }, "test")}
              >
                {busy === "test" ? "发送中…" : "试发"}
              </button>
            </div>
          </div>
        </div>

        <div className="campaign-step">
          <div className="campaign-step-no">2</div>
          <div>
            <div className="campaign-step-title">确认后正式群发</div>
            <label className="variant-check" style={{ margin: "8px 0 12px" }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={!ready}
              />
              <span>我已试发确认过，现在发给 <b>{target}</b> 位订阅者（不可撤销）</span>
            </label>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              disabled={!ready || !confirmed || target === 0 || busy !== null}
              onClick={() => post({ subject, body, locale }, "send")}
            >
              {busy === "send" ? `发送中…（${target} 封）` : `群发给 ${target} 人`}
            </button>
          </div>
        </div>
      </div>

      {msg && <p className="campaign-ok">{msg}</p>}
      {err && <p className="variant-msg" style={{ marginTop: 12 }}>{err}</p>}
    </section>
  );
}
