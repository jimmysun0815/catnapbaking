import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { serviceClient } from "@/lib/supabase";

/** Supabase 免费版 7 天无请求会暂停项目，每天打一次即可 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return new NextResponse("unauthorized", { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ ok: true, note: "demo mode" });
  const { error } = await db.from("products").select("id").limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString() });
}
