import { getCurrentBatch, getProductsForAdmin, effectivePrice } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-guard";
import { VariantRow } from "@/components/VariantRow";

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
  const [products, batch] = await Promise.all([getProductsForAdmin(), getCurrentBatch()]);

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">catalogue</div>
          <h1>商品与价格</h1>
          <p className="admin-sub">
            改价立即对新订单生效。已下单的订单保留下单时的价格快照，历史报表不受影响。
            每次改价都会记一条审计（操作人、时间、改动前后金额）。
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
                  <th className="num" />
                </tr>
              </thead>
              <tbody>
                {p.variants.map((v) => (
                  <VariantRow key={v.id} variant={v} actualCents={effectivePrice(batch, v)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="admin-foot-note">
        「本期实际价」是批次活动价覆盖后的结果，改常规价不会覆盖本期活动价 —— 活动价在批次里设。
        SKU 不可改：它是订单和报表的关联键，改了会对不上历史数据。
      </p>
    </>
  );
}
