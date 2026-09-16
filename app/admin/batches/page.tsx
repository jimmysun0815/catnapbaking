import { getFlavours, usingDemoData } from "@/lib/data";
import { serviceClient } from "@/lib/supabase";
import { BatchForm } from "@/components/BatchForm";
import { BatchStatusButtons } from "@/components/BatchStatusButtons";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿", open: "开放中", closed: "已截单", completed: "已完成", cancelled: "已取消",
};

export default async function BatchesAdmin() {
  await requireAdmin();
  const flavours = await getFlavours();
  const db = serviceClient();

  const { data: batches } = db
    ? await db.from("batches").select("*, pickup_slots(id)").order("opens_at", { ascending: false })
    : { data: null };

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">batches</div>
          <h1>批次</h1>
          <p className="admin-sub">
            一个批次就是一次烘焙。设好开单和截单时间、总产能、自取时段，前台就会自动显示倒计时和剩余数量。
          </p>
        </div>
      </div>

      {batches && batches.length > 0 && (
        <div className="table-scroll" style={{ marginTop: 26 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>名称</th><th>状态</th><th>开单</th><th>截单</th>
                <th className="num">产能</th><th className="num">时段</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name_zh}</td>
                  <td>
                    <span className={`pill ${b.status === "open" ? "pill-paid" : "pill-quiet"}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </td>
                  <td>{new Date(b.opens_at).toLocaleString("zh-CN")}</td>
                  <td>{new Date(b.closes_at).toLocaleString("zh-CN")}</td>
                  <td className="num">{b.capacity_boxes}</td>
                  <td className="num">{b.pickup_slots?.length ?? 0}</td>
                  <td><BatchStatusButtons id={b.id} status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {usingDemoData && (
        <p className="notice-box" style={{ marginTop: 26 }}>
          当前是演示模式，前台显示的是 <code>lib/seed.ts</code> 里的示例批次。
          接上 Supabase 后，这里创建的批次才会真正生效。
        </p>
      )}

      <section style={{ marginTop: 44 }}>
        <h2>新建批次</h2>
        <BatchForm flavours={flavours} dbReady={!usingDemoData} />
      </section>
    </>
  );
}
