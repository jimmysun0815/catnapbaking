import { getCurrentBatch, getProducts, effectivePrice } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const MODE: Record<string, string> = {
  none: "单一产品，不选口味",
  single: "每盒选一种口味",
  mix: "可混装",
};

/**
 * 价格与规格全部存数据库，代码里不写死。
 * 关键规则：订单存价格快照，改价不影响历史订单和历史报表。
 */
export default async function ProductsAdmin() {
  await requireAdmin();
  const [products, batch] = await Promise.all([getProducts(), getCurrentBatch()]);

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">catalogue</div>
          <h1>商品与价格</h1>
          <p className="admin-sub">
            改价立即对新订单生效。已下单的订单保留下单时的价格快照，历史报表不受影响。
          </p>
        </div>
      </div>

      {products.map((p) => (
        <section key={p.id} style={{ marginTop: 40 }}>
          <div className="admin-head">
            <h2>{p.name_zh} <span style={{ color: "#826b5a", fontSize: 12, fontWeight: 400 }}>{p.name_en}</span></h2>
            <span className="pill pill-quiet">口味模式：{MODE[p.flavour_mode]}</span>
          </div>

          <div className="table-scroll" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>规格</th><th>SKU</th><th className="num">每盒块数</th>
                  <th className="num">常规价</th><th className="num">本期实际价</th>
                </tr>
              </thead>
              <tbody>
                {p.variants.map((v) => {
                  const actual = effectivePrice(batch, v);
                  const promo = actual !== v.price_cents;
                  return (
                    <tr key={v.id}>
                      <td>{v.name_zh}</td>
                      <td style={{ color: "#826b5a", fontSize: 12 }}>{v.sku}</td>
                      <td className="num">{v.cookie_count}</td>
                      <td className="num">{formatCents(v.price_cents)}</td>
                      <td className="num" style={promo ? { color: "#b65f3e" } : undefined}>
                        {formatCents(actual)}{promo && " ·活动价"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="admin-foot-note">
        编辑表单待接入 Supabase 后开放：改价会写一条 price_changes 记录，含操作人、时间、改动前后金额。
      </p>
    </>
  );
}
