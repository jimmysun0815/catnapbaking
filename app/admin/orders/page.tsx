import { getOrders } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "待付款",  cls: "pill-quiet" },
  paid:      { label: "已付款",  cls: "pill-paid" },
  packed:    { label: "已打包",  cls: "pill-paid" },
  picked_up: { label: "已取货",  cls: "pill-quiet" },
  no_show:   { label: "未取货",  cls: "pill-warn" },
  refunded:  { label: "已退款",  cls: "pill-warn" },
  expired:   { label: "已过期",  cls: "pill-quiet" },
  cancelled: { label: "已取消",  cls: "pill-quiet" },
};
const CHANNEL: Record<string, string> = { web: "网站", wechat: "微信群", b2b: "企业礼盒", platform: "平台" };
const METHOD: Record<string, string> = { card: "信用卡", wechat_pay: "微信支付", alipay: "支付宝", etransfer: "e-Transfer", cash: "现金" };

export default async function OrdersAdmin() {
  await requireAdmin();
  const orders = await getOrders();

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">orders</div>
          <h1>订单</h1>
        </div>
        <span className="admin-sub">{orders.length} 单</span>
      </div>

      <div className="table-scroll" style={{ marginTop: 26 }}>
        <table className="admin-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>订单号</th><th>顾客</th><th>明细</th><th>渠道</th><th>支付</th><th>状态</th><th className="num">金额</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, cls: "pill-quiet" };
              return (
                <tr key={o.id}>
                  <td>{o.order_no}</td>
                  <td>
                    <div>{o.contact_name}</div>
                    <div style={{ color: "#826b5a", fontSize: 11 }}>{o.contact_phone}</div>
                  </td>
                  <td style={{ color: "#6c5042" }}>
                    {o.items.map((i, n) => <div key={n}>{i.variant_name_zh} × {i.quantity}</div>)}
                    {o.gift_message && <div style={{ color: "#b65f3e", fontSize: 11, marginTop: 4 }}>礼品留言：{o.gift_message}</div>}
                  </td>
                  <td style={{ color: "#826b5a" }}>{CHANNEL[o.channel] ?? o.channel}</td>
                  <td style={{ color: "#826b5a" }}>{o.payment_method ? METHOD[o.payment_method] ?? o.payment_method : "—"}</td>
                  <td><span className={`pill ${s.cls}`}>{s.label}</span></td>
                  <td className="num">{formatCents(o.total_cents)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
