import { NextResponse } from "next/server";
import { isConfigured, canWrite, serviceClient } from "@/lib/supabase";
import { stripeConfigured } from "@/lib/stripe";
import { mockPaymentsEnabled } from "@/lib/payments";
import { siteMode } from "@/lib/site-mode";

/**
 * 配完环境变量后打开 /api/health 自检。
 * 只报告「配没配上、连不连得通、表在不在」，不回显任何密钥。
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    site_mode: siteMode,
    supabase_configured: isConfigured,
    supabase_can_write: canWrite,
    stripe_configured: stripeConfigured,
    mock_payments: mockPaymentsEnabled,
    resend_configured: Boolean(process.env.RESEND_API_KEY),
    data_source: isConfigured ? "supabase" : "demo seed",
  };

  const db = serviceClient();
  if (db) {
    const tables = ["products", "variants", "flavours", "batches", "pickup_slots", "orders", "order_items"];
    const found: Record<string, number | string> = {};
    for (const t of tables) {
      const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
      found[t] = error ? `ERROR: ${error.message}` : (count ?? 0);
    }
    checks.tables = found;

    const { data: openBatch } = await db
      .from("batches").select("id, name_zh, status").eq("status", "open").maybeSingle();
    checks.open_batch = openBatch?.name_zh ?? null;
    if (!openBatch) checks.next_step = "还没有开放的批次，去 /admin/batches 建一个";
  } else {
    checks.next_step = isConfigured
      ? "只配了 publishable key，服务端写不了。补上 SUPABASE_SECRET_KEY"
      : "还没配 Supabase，把 .env.example 复制成 .env.local 填好后重启 dev";
  }

  return NextResponse.json(checks, { status: 200 });
}
