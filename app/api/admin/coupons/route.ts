import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-guard";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * 优惠券管理。
 * 创建、停用/恢复、改有效期与次数上限。
 * 不提供删除：券一旦发出去就可能已经被用过，删掉会让核销记录失去对照。
 * 要停用就 active=false。
 */
const CreateBody = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9-]+$/, "只能用字母、数字和连字符"),
  kind: z.enum(["percent", "amount"]),
  percentOff: z.number().int().min(1).max(100).nullable().optional(),
  amountOffCents: z.number().int().min(1).max(1_000_000).nullable().optional(),
  minSubtotalCents: z.number().int().min(0).max(1_000_000).default(0),
  maxRedemptions: z.number().int().min(1).max(100_000).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

const PatchBody = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
  /** 立即过期：把 expires_at 设成现在 */
  expireNow: z.boolean().optional(),
  maxRedemptions: z.number().int().min(1).max(100_000).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

async function guard() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!serviceClient()) {
    return NextResponse.json({ error: "数据库未连接" }, { status: 503 });
  }
  return null;
}

export async function POST(req: Request) {
  const bad = await guard(); if (bad) return bad;
  const db = serviceClient()!;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 }
    );
  }
  const b = parsed.data;

  // 折扣方式与数值必须配套。库里也有 check 约束兜底，这里先给出可读的错误
  if (b.kind === "percent" && !b.percentOff) {
    return NextResponse.json({ error: "按比例折扣需要填百分比" }, { status: 400 });
  }
  if (b.kind === "amount" && !b.amountOffCents) {
    return NextResponse.json({ error: "按金额折扣需要填金额" }, { status: 400 });
  }
  if (b.startsAt && b.expiresAt && new Date(b.startsAt) >= new Date(b.expiresAt)) {
    return NextResponse.json({ error: "生效时间必须早于过期时间" }, { status: 400 });
  }

  const user = await getSessionUser();
  const { data, error } = await db.from("coupons").insert({
    code: b.code.toUpperCase(),
    kind: b.kind,
    percent_off: b.kind === "percent" ? b.percentOff : null,
    amount_off_cents: b.kind === "amount" ? b.amountOffCents : null,
    min_subtotal_cents: b.minSubtotalCents,
    max_redemptions: b.maxRedemptions ?? null,
    starts_at: b.startsAt || null,
    expires_at: b.expiresAt || null,
    note: b.note || null,
    created_by: user?.id ?? null,
  }).select("id, code").single();

  if (error) {
    // 23505 = 唯一索引冲突，也就是券码重复
    if (error.code === "23505") {
      return NextResponse.json({ error: "这个券码已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, coupon: data });
}

export async function PATCH(req: Request) {
  const bad = await guard(); if (bad) return bad;
  const db = serviceClient()!;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求有误" }, { status: 400 });
  }
  const { id, active, expireNow, maxRedemptions, expiresAt } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (active !== undefined) patch.active = active;
  if (expireNow) patch.expires_at = new Date().toISOString();
  else if (expiresAt !== undefined) patch.expires_at = expiresAt || null;
  if (maxRedemptions !== undefined) patch.max_redemptions = maxRedemptions;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "没有要改的内容" }, { status: 400 });
  }

  const { error } = await db.from("coupons").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
