import { getCurrentBatch, getOrders } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const PAID = ["paid", "packed", "picked_up", "no_show"];

/** 截单后照着这张表烤。块数决定和面量，盒数决定装盒 */
export default async function BakeSheet() {
  await requireAdmin();
  const batch = await getCurrentBatch();
  if (!batch) return <p className="admin-sub">当前没有开放的批次。</p>;

  const orders = (await getOrders(batch.id)).filter((o) => PAID.includes(o.status));

  const byVariant = new Map<string, { name: string; boxes: number; cookies: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const cur = byVariant.get(i.variant_id) ?? { name: i.variant_name_zh, boxes: 0, cookies: 0 };
      cur.boxes += i.quantity;
      cur.cookies += i.quantity * i.cookie_count;
      byVariant.set(i.variant_id, cur);
    }
  }
  const totalCookies = [...byVariant.values()].reduce((s, v) => s + v.cookies, 0);
  const totalBoxes = [...byVariant.values()].reduce((s, v) => s + v.boxes, 0);
  // 简报里成本按 10% 损耗计，烘焙也多做一点
  const withSpare = Math.ceil(totalCookies * 1.1);

  const bySlot = new Map<string, number>();
  for (const o of orders) if (o.slot_id) bySlot.set(o.slot_id, (bySlot.get(o.slot_id) ?? 0) + 1);

  const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">bake sheet</div>
          <h1>烘焙清单</h1>
          <p className="admin-sub">{batch.name_zh}</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat stat-accent">
          <div className="stat-key">要烤</div>
          <div className="stat-val" style={{ fontSize: 40 }}>{withSpare}</div>
          <div className="stat-note">块 · 含 10% 损耗</div>
        </div>
        <div className="stat">
          <div className="stat-key">订单需要</div>
          <div className="stat-val" style={{ fontSize: 40 }}>{totalCookies}</div>
          <div className="stat-note">块</div>
        </div>
        <div className="stat">
          <div className="stat-key">装盒</div>
          <div className="stat-val" style={{ fontSize: 40 }}>{totalBoxes}</div>
          <div className="stat-note">盒</div>
        </div>
      </div>

      <section style={{ marginTop: 46 }}>
        <h2>按规格</h2>
        <table className="admin-table" style={{ marginTop: 16 }}>
          <thead>
            <tr><th>规格</th><th className="num">盒数</th><th className="num">曲奇块数</th></tr>
          </thead>
          <tbody>
            {[...byVariant.values()].map((v) => (
              <tr key={v.name}>
                <td>{v.name}</td>
                <td className="num">{v.boxes}</td>
                <td className="num">{v.cookies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 46, maxWidth: 460 }}>
        <h2>取货时段分布</h2>
        <table className="admin-table" style={{ marginTop: 16 }}>
          <tbody>
            {batch.slots.map((s) => (
              <tr key={s.id}>
                <td>{hhmm(s.starts_at)} – {hhmm(s.ends_at)}</td>
                <td className="num">{bySlot.get(s.id) ?? 0} 单</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
