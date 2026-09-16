import { getCurrentBatch, getOrders, usingDemoData } from "@/lib/data";
import { formatCents, stripeFeeCents } from "@/lib/money";
import { requireAdmin } from "@/lib/admin-guard";

// 实时数据
export const dynamic = "force-dynamic";

const PAID = ["paid", "packed", "picked_up", "no_show"];
const CHANNEL: Record<string, string> = { web: "网站", wechat: "微信群", b2b: "企业礼盒", platform: "平台" };
const METHOD: Record<string, string> = { card: "信用卡", wechat_pay: "微信支付", alipay: "支付宝", etransfer: "e-Transfer", cash: "现金" };

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "accent" | "dark" }) {
  return (
    <div className={`stat ${tone === "accent" ? "stat-accent" : tone === "dark" ? "stat-dark" : ""}`}>
      <div className="stat-key">{label}</div>
      <div className="stat-val">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function Bar({ label, value, total, right, alt }: { label: string; value: number; total: number; right: string; alt?: boolean }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-head"><span>{label}</span><b>{right} · {pct}%</b></div>
      <div className="bar-track"><div className={`bar-fill ${alt ? "bar-fill-2" : ""}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const [batch, orders] = await Promise.all([getCurrentBatch(), getOrders()]);

  const paid = orders.filter((o) => PAID.includes(o.status));
  const gross = paid.reduce((s, o) => s + o.total_cents, 0);
  const boxes = paid.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const cookies = paid.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity * i.cookie_count, 0), 0);
  const fees = paid
    .filter((o) => o.payment_method && !["etransfer", "cash"].includes(o.payment_method))
    .reduce((s, o) => s + (o.fee_cents || stripeFeeCents(o.total_cents)), 0);
  const avg = paid.length ? Math.round(gross / paid.length) : 0;

  const byChannel = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const o of paid) {
    byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + o.total_cents);
    const k = o.payment_method ?? "unknown";
    byMethod.set(k, (byMethod.get(k) ?? 0) + o.total_cents);
  }

  // 简报：保本约 160 盒/月，目标 300 → 600
  const BREAKEVEN = 160, TARGET = 300;

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">dashboard</div>
          <h1>看板</h1>
        </div>
        {usingDemoData && <span className="tag-demo">演示数据</span>}
      </div>

      <div className="stat-grid">
        <Stat label="毛收入" value={formatCents(gross)} note={`${paid.length} 单`} tone="accent" />
        <Stat label="Stripe 手续费" value={formatCents(fees)} note={gross ? `占 ${((fees / gross) * 100).toFixed(1)}%` : undefined} />
        <Stat label="净收入" value={formatCents(gross - fees)} />
        <Stat label="客单价" value={formatCents(avg)} />
      </div>

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <Stat label="盒数" value={String(boxes)} note={`${cookies} 块曲奇`} />
        <Stat label="距保本" value={`${Math.max(0, BREAKEVEN - boxes)} 盒`} note={`保本 ${BREAKEVEN} 盒/月`} />
        <Stat label="距目标" value={`${Math.max(0, TARGET - boxes)} 盒`} note={`目标 ${TARGET} 盒/月`} />
        <Stat
          label="本期产能"
          value={batch ? `${batch.boxes_taken}/${batch.capacity_boxes}` : "—"}
          note={batch ? `利用率 ${Math.round((batch.boxes_taken / batch.capacity_boxes) * 100)}%` : undefined}
          tone="dark"
        />
      </div>

      <div style={{ display: "grid", gap: "44px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginTop: 46 }}>
        <section>
          <h2>渠道占比</h2>
          <p className="admin-sub">目标：厨房自取 40 · 自送 25 · 平台 20 · 微信团购 15</p>
          <div style={{ marginTop: 14, borderTop: "1px solid rgba(51,36,30,.14)" }}>
            {[...byChannel.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <Bar key={k} label={CHANNEL[k] ?? k} value={v} total={gross} right={formatCents(v)} />
            ))}
          </div>
        </section>

        <section>
          <h2>支付方式</h2>
          <p className="admin-sub">微信和支付宝占比决定这两个通道值不值得留着</p>
          <div style={{ marginTop: 14, borderTop: "1px solid rgba(51,36,30,.14)" }}>
            {[...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <Bar key={k} label={METHOD[k] ?? k} value={v} total={gross} right={formatCents(v)} alt />
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 50 }}>
        <h2>最近订单</h2>
        <div className="table-scroll" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>订单号</th><th>顾客</th><th>渠道</th><th>状态</th><th className="num">金额</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((o) => (
                <tr key={o.id}>
                  <td>{o.order_no}</td>
                  <td>{o.contact_name}</td>
                  <td style={{ color: "#826b5a" }}>{CHANNEL[o.channel] ?? o.channel}</td>
                  <td>
                    <span className={`pill ${o.status === "paid" ? "pill-paid" : "pill-quiet"}`}>
                      {o.status === "paid" ? "已付款" : o.status === "pending" ? "待付款" : o.status}
                    </span>
                  </td>
                  <td className="num">{formatCents(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
