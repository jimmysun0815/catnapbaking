import { serviceClient } from "@/lib/supabase";
import { siteMode } from "@/lib/site-mode";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

type Row = {
  id: string; email: string; locale: string; source: string | null;
  consented_at: string; notified_at: string | null; unsubscribed_at: string | null;
};

/** 预热期留邮箱的人。开业时按这份名单群发通知 */
export default async function WaitlistAdmin() {
  await requireAdmin();
  const db = serviceClient();
  const { data } = db
    ? await db.from("waitlist").select("*").order("consented_at", { ascending: false })
    : { data: null };
  const rows = (data ?? []) as Row[];

  const zh = rows.filter((r) => r.locale === "zh").length;
  const notified = rows.filter((r) => r.notified_at).length;
  const unsub = rows.filter((r) => r.unsubscribed_at).length;
  const active = rows.length - unsub;
  const last7 = rows.filter(
    (r) => Date.now() - new Date(r.consented_at).getTime() < 7 * 86400_000
  ).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">waitlist</div>
          <h1>候补名单</h1>
          <p className="admin-sub">
            预热期留下邮箱的人。开业时按这份名单发通知，之后就可以停掉预热模式了。
          </p>
        </div>
        <span className={`pill ${siteMode === "teaser" ? "pill-paid" : "pill-quiet"}`}>
          当前：{siteMode === "teaser" ? "预热模式" : "已开业"}
        </span>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat stat-accent">
          <div className="stat-key">可发送</div>
          <div className="stat-val">{active}</div>
          <div className="stat-note">总 {rows.length} 人，已退订 {unsub} 人</div>
        </div>
        <div className="stat">
          <div className="stat-key">最近 7 天</div>
          <div className="stat-val">{last7}</div>
        </div>
        <div className="stat">
          <div className="stat-key">中文 / 英文</div>
          <div className="stat-val">{zh} / {rows.length - zh}</div>
        </div>
        <div className="stat">
          <div className="stat-key">已通知</div>
          <div className="stat-val">{notified}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-foot-note">还没有人留邮箱。</p>
      ) : (
        <div className="table-scroll" style={{ marginTop: 30 }}>
          <table className="admin-table">
            <thead>
              <tr><th>邮箱</th><th>语言</th><th>来源</th><th>时间</th><th>状态</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td style={{ color: "#826b5a" }}>{r.locale === "zh" ? "中文" : "English"}</td>
                  <td style={{ color: "#826b5a" }}>{r.source ?? "—"}</td>
                  <td style={{ color: "#826b5a" }}>
                    {new Date(r.consented_at).toLocaleString("zh-CN")}
                  </td>
                  <td>
                    {r.unsubscribed_at ? (
                      <span className="pill pill-warn">已退订</span>
                    ) : (
                      <span className={`pill ${r.notified_at ? "pill-paid" : "pill-quiet"}`}>
                        {r.notified_at ? "已通知" : "待通知"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-foot-note">
        每条都存了留邮箱时页面上的同意文案原文，这是加拿大反垃圾邮件法要求的证据。
        群发在「邮件群发」页，只发给未退订的人，每封自动带退订链接。
      </p>
    </>
  );
}
