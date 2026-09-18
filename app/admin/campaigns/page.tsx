import { serviceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";
import { marketingBlockers } from "@/lib/marketing";
import { CampaignComposer } from "@/components/CampaignComposer";

export const dynamic = "force-dynamic";

type Row = {
  id: string; subject: string; locale: string | null; status: string;
  recipient_count: number; sent_count: number; failed_count: number;
  created_at: string; sent_at: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "pill-quiet" },
  sending: { label: "发送中", cls: "pill-quiet" },
  sent: { label: "已发送", cls: "pill-paid" },
  failed: { label: "失败", cls: "pill-warn" },
};

export default async function CampaignsAdmin() {
  await requireAdmin();
  const db = serviceClient();

  const [recipients, history] = await Promise.all([
    db
      ? db.from("waitlist").select("locale").is("unsubscribed_at", null)
      : Promise.resolve({ data: null }),
    db
      ? db.from("campaigns").select("*").order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: null }),
  ]);

  const list = (recipients.data ?? []) as { locale: string }[];
  const counts = {
    all: list.length,
    zh: list.filter((r) => r.locale === "zh").length,
    en: list.filter((r) => r.locale === "en").length,
  };
  const rows = (history.data ?? []) as Row[];

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">campaigns</div>
          <h1>邮件群发</h1>
          <p className="admin-sub">
            发给候补名单里<b>未退订</b>的人。已退订的不会出现在收件范围里，也发不出去。
            每封自动带退订链接，同一批次不会重复发给同一个人。
          </p>
        </div>
        <span className="pill pill-quiet">可发送 {counts.all} 人</span>
      </div>

      <CampaignComposer counts={counts} blockers={marketingBlockers()} />

      <section style={{ marginTop: 48 }}>
        <h2>发送记录</h2>
        {rows.length === 0 ? (
          <p className="admin-foot-note">还没有发过。</p>
        ) : (
          <div className="table-scroll" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>主题</th><th>范围</th><th className="num">收件</th>
                  <th className="num">成功</th><th className="num">失败</th>
                  <th>时间</th><th>状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.draft;
                  return (
                    <tr key={r.id}>
                      <td>{r.subject}</td>
                      <td style={{ color: "#826b5a" }}>
                        {r.locale === null ? "全部" : r.locale === "zh" ? "中文" : "English"}
                      </td>
                      <td className="num">{r.recipient_count}</td>
                      <td className="num">{r.sent_count}</td>
                      <td className="num" style={r.failed_count ? { color: "#a8433a" } : undefined}>
                        {r.failed_count}
                      </td>
                      <td style={{ color: "#826b5a", fontSize: 12 }}>
                        {new Date(r.sent_at ?? r.created_at).toLocaleString("zh-CN")}
                      </td>
                      <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
