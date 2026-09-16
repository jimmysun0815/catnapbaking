import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { serviceClient } from "@/lib/supabase";

/** 取货前一天提醒。Hobby 上触发时间有 ±59 分钟浮动，对提醒邮件可以接受 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return new NextResponse("unauthorized", { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ sent: 0, note: "demo mode" });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
  const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

  const { data: slots } = await db.from("pickup_slots").select("id")
    .gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString());
  const slotIds = (slots ?? []).map((s) => s.id);
  if (slotIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: orders } = await db.from("orders")
    .select("id, contact_email").in("slot_id", slotIds).eq("status", "paid");

  // 用 Resend 批量接口一次提交，减少逐封发送的开销
  return NextResponse.json({ sent: orders?.length ?? 0 });
}
