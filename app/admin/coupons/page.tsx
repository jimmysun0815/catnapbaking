import { serviceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";
import { formatCents } from "@/lib/money";
import { CouponManager, type CouponRow } from "@/components/CouponManager";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin() {
  await requireAdmin();
  const db = serviceClient();

  const [couponsRes, redeemRes] = await Promise.all([
    db ? db.from("coupons").select("*").order("created_at", { ascending: false })
       : Promise.resolve({ data: null }),
    db ? db.from("coupon_redemptions").select("discount_cents, redeemed_at")
       : Promise.resolve({ data: null }),
  ]);

  const rows = (couponsRes.data ?? []) as CouponRow[];
  const redemptions = (redeemRes.data ?? []) as { discount_cents: number; redeemed_at: string }[];

  const now = Date.now();
  const live = rows.filter((c) =>
    c.active &&
    (!c.starts_at || now >= new Date(c.starts_at).getTime()) &&
    (!c.expires_at || now < new Date(c.expires_at).getTime()) &&
    (c.max_redemptions == null || c.redeemed_count < c.max_redemptions)
  ).length;

  const totalUsed = redemptions.length;
  const totalOff = redemptions.reduce((s, r) => s + r.discount_cents, 0);
  const last30 = redemptions.filter(
    (r) => now - new Date(r.redeemed_at).getTime() < 30 * 86400_000
  ).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="section-index">coupons</div>
          <h1>优惠券</h1>
          <p className="admin-sub">
            每单只能用一张。是否过期、次数是否用完，都由数据库在核销那一刻判定，
            所以不会出现前台显示可用、实际扣款时失效的情况。
          </p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat stat-accent">
          <div className="stat-key">生效中</div>
          <div className="stat-val">{live}</div>
          <div className="stat-note">共 {rows.length} 张</div>
        </div>
        <div className="stat">
          <div className="stat-key">累计核销</div>
          <div className="stat-val">{totalUsed}</div>
        </div>
        <div className="stat">
          <div className="stat-key">最近 30 天</div>
          <div className="stat-val">{last30}</div>
        </div>
        <div className="stat stat-dark">
          <div className="stat-key">累计优惠金额</div>
          <div className="stat-val">{formatCents(totalOff)}</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <CouponManager rows={rows} />
      </div>

      <p className="admin-foot-note">
        停用与「立即过期」都不会删除券：券发出去后可能已经被用过，
        删掉会让核销记录失去对照。停用后顾客再输入只会提示无效。
      </p>
    </>
  );
}
