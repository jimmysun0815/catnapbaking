import { requireAdmin } from "@/lib/admin-guard";
import { getSiteMode, envSiteMode } from "@/lib/site-mode";
import { serviceClient } from "@/lib/supabase";
import { SiteModeToggle } from "@/components/SiteModeToggle";

export const dynamic = "force-dynamic";

export default async function SettingsAdmin() {
  await requireAdmin();
  const mode = await getSiteMode();

  const db = serviceClient();
  const { data: row } = db
    ? await db.from("site_settings").select("updated_at, updated_by").eq("id", 1).maybeSingle()
    : { data: null };

  // 数据库读不到时会退回环境变量，这种情况要让运营知道按钮点了不管用
  const usingFallback = !db || !row;

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">settings</div>
          <h1>站点模式</h1>
          <p className="admin-sub">
            预热与正式运营共用同一套代码，切换即时生效，不需要重新部署。
          </p>
        </div>
      </div>

      {usingFallback && (
        <div className="admin-alert" style={{ marginTop: 22 }}>
          <strong>当前读的是环境变量兜底值（{envSiteMode}），切换不会生效。</strong>
          <ul>
            <li>数据库未连接，或 site_settings 表还没建（迁移 006 未执行）</li>
          </ul>
        </div>
      )}

      <SiteModeToggle current={mode} />

      {row?.updated_at && (
        <p className="admin-foot-note">
          上次切换：{new Date(row.updated_at).toLocaleString("zh-CN")}
        </p>
      )}

      <p className="admin-foot-note" style={{ marginTop: row?.updated_at ? 0 : undefined }}>
        环境变量 <code>NEXT_PUBLIC_SITE_MODE</code> 现在只是兜底值，数据库读不到时才用它。
        它是构建期内联的，改了要重新部署，所以不能拿来当开关。
      </p>
    </>
  );
}
