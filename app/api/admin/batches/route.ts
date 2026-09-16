import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-guard";

const Body = z.object({
  name_zh: z.string().trim().min(1).max(80),
  name_en: z.string().trim().min(1).max(80),
  opens_at: z.string().min(1),
  closes_at: z.string().min(1),
  capacity_boxes: z.number().int().positive().max(10000),
  pickup_address: z.string().trim().min(1).max(200),
  pickup_note_zh: z.string().trim().max(300).optional().nullable(),
  pickup_note_en: z.string().trim().max(300).optional().nullable(),
  flavour_ids: z.array(z.string().uuid()).default([]),
  // 自取时段按「起点 + 时长 + 段数」批量生成，省得一条条填
  pickup_date: z.string().min(1),
  slot_start_hour: z.number().int().min(0).max(23),
  slot_count: z.number().int().min(1).max(12),
  slot_minutes: z.number().int().min(15).max(240),
  slot_max_orders: z.number().int().min(1).max(200),
  open_now: z.boolean().default(false),
});

export async function POST(req: Request) {
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

  if (new Date(b.closes_at) <= new Date(b.opens_at)) {
    return NextResponse.json({ error: "截单时间必须晚于开单时间" }, { status: 400 });
  }

  const { data: batch, error } = await db.from("batches").insert({
    name_zh: b.name_zh,
    name_en: b.name_en,
    status: b.open_now ? "open" : "draft",
    opens_at: new Date(b.opens_at).toISOString(),
    closes_at: new Date(b.closes_at).toISOString(),
    capacity_boxes: b.capacity_boxes,
    pickup_address: b.pickup_address,
    pickup_note_zh: b.pickup_note_zh || null,
    pickup_note_en: b.pickup_note_en || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 生成自取时段
  const slots = Array.from({ length: b.slot_count }, (_, i) => {
    const start = new Date(`${b.pickup_date}T00:00:00`);
    start.setHours(b.slot_start_hour, 0, 0, 0);
    start.setMinutes(start.getMinutes() + i * b.slot_minutes);
    const end = new Date(start.getTime() + b.slot_minutes * 60_000);
    return {
      batch_id: batch.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      max_orders: b.slot_max_orders,
    };
  });
  const { error: slotErr } = await db.from("pickup_slots").insert(slots);
  if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 });

  if (b.flavour_ids.length) {
    await db.from("batch_flavours").insert(
      b.flavour_ids.map((flavour_id) => ({ batch_id: batch.id, flavour_id }))
    );
  }

  return NextResponse.json({ ok: true, id: batch.id, slots: slots.length });
}

/** 开单 / 截单 / 完成 */
export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "数据库未连接" }, { status: 503 });

  const Patch = z.object({
    id: z.string().uuid(),
    status: z.enum(["draft", "open", "closed", "completed", "cancelled"]),
  });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { error } = await db.from("batches")
    .update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
