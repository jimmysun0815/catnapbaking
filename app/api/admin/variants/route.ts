import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-guard";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * 改规格与价格。
 * 价格只改 variants.price_cents，不碰历史订单——订单存的是下单时的价格快照，
 * 所以改价不会污染历史报表。每次改价写一条 price_changes 审计。
 */
const Body = z.object({
  id: z.string().uuid(),
  name_zh: z.string().trim().min(1).max(80),
  name_en: z.string().trim().min(1).max(80),
  cookie_count: z.number().int().min(1).max(200),
  price_cents: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
});

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = serviceClient();
  if (!db) {
    return NextResponse.json(
      { error: "数据库未连接。填好 .env.local 里的 Supabase 变量后重试。" },
      { status: 503 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 }
    );
  }
  const b = parsed.data;

  // 先读旧价，用于审计和「有没有真的改」的判断
  const { data: before, error: readErr } = await db
    .from("variants").select("price_cents").eq("id", b.id).maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "规格不存在" }, { status: 404 });

  const { error: updErr } = await db
    .from("variants")
    .update({
      name_zh: b.name_zh,
      name_en: b.name_en,
      cookie_count: b.cookie_count,
      price_cents: b.price_cents,
      active: b.active,
    })
    .eq("id", b.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  let audited = false;
  if (before.price_cents !== b.price_cents) {
    const user = await getSessionUser();
    // 列名沿用 000_init_schema 里既有的定义，changed_by 指向 profiles.id
    // （与 auth.users.id 同值）
    const { error: auditErr } = await db.from("price_changes").insert({
      variant_id: b.id,
      old_price_cents: before.price_cents,
      new_price_cents: b.price_cents,
      changed_by: user?.id ?? null,
    });
    // 审计写失败不回滚改价，但要让调用方知道，否则会以为留了痕迹
    if (auditErr) {
      return NextResponse.json(
        { ok: true, audited: false, warning: `改价已生效，但审计记录写入失败：${auditErr.message}` },
        { status: 200 }
      );
    }
    audited = true;
  }

  return NextResponse.json({ ok: true, audited });
}
