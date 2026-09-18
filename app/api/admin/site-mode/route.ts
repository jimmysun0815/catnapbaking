import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-guard";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * 切换站点模式。
 * 写 site_settings 单行表，前台各页都是 force-dynamic，下一次请求即生效，
 * 不用重新部署。
 */
const Body = z.object({ mode: z.enum(["teaser", "live"]) });

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = serviceClient();
  if (!db) {
    return NextResponse.json(
      { error: "数据库未连接，无法切换模式" },
      { status: 503 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "mode 必须是 teaser 或 live" }, { status: 400 });
  }

  const user = await getSessionUser();
  const { error } = await db.from("site_settings").upsert({
    id: 1,
    mode: parsed.data.mode,
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 首页有 ISR 以外的缓存层时一并失效，保证切换后立刻看得到
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, mode: parsed.data.mode });
}
