import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  locale: z.enum(["zh", "en"]).default("zh"),
  source: z.string().trim().max(60).optional(),
  consentText: z.string().trim().min(1).max(400),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const { email, locale, source, consentText } = parsed.data;

  const db = serviceClient();
  if (!db) {
    // 没接数据库时也让前端走通，但明确告知没存下来
    return NextResponse.json({ ok: true, stored: false });
  }

  const { error } = await db.from("waitlist").insert({
    email, locale, source: source ?? null, consent_text: consentText,
  });

  // 重复提交不算错误，对顾客来说就是「已经在名单里了」
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true, already: error?.code === "23505" });
}
