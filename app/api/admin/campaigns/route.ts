import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-guard";
import { getSessionUser } from "@/lib/supabase/server";
import { campaignHtml, marketingBlockers, SENDER_NAME } from "@/lib/marketing";

/**
 * 邮件群发。
 *
 * 设计要点：
 *   - 只发给未退订的人。退订过滤在查询层做，不依赖调用方传对参数。
 *   - 每个收件人写一条 campaign_sends（唯一约束 campaign_id+waitlist_id），
 *     所以同一批次重发不会重复打扰同一个人。
 *   - 合规要素缺失时直接拒绝，而不是发出一封不合规的邮件。
 *   - 逐封串行发送并限速：Resend 免费档有速率限制，量小的时候串行最省心。
 */
const Body = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  locale: z.enum(["zh", "en", "all"]).default("all"),
  /** 试发：只发给这个地址，不写 campaign_sends，也不动 notified_at */
  testTo: z.string().trim().email().optional(),
});

const FROM = process.env.EMAIL_FROM ?? `${SENDER_NAME} <orders@catnapbaking.ca>`;

async function sendOne(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const blockers = marketingBlockers();
  if (blockers.length) {
    return NextResponse.json({ error: blockers.join("；") }, { status: 503 });
  }

  const db = serviceClient();
  if (!db) {
    return NextResponse.json({ error: "数据库未连接" }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 }
    );
  }
  const { subject, body, locale, testTo } = parsed.data;

  // ---- 试发：不落库，只验证样式和送达 ----
  if (testTo) {
    try {
      await sendOne(
        testTo,
        `[试发] ${subject}`,
        campaignHtml({ body, token: "test-token-not-valid", locale: locale === "en" ? "en" : "zh" })
      );
      return NextResponse.json({ ok: true, test: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "试发失败" },
        { status: 502 }
      );
    }
  }

  // ---- 正式群发 ----
  let q = db
    .from("waitlist")
    .select("id, email, locale, unsubscribe_token")
    .is("unsubscribed_at", null);
  if (locale !== "all") q = q.eq("locale", locale);

  const { data: recipients, error: readErr } = await q;
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!recipients?.length) {
    return NextResponse.json({ error: "没有符合条件的收件人" }, { status: 400 });
  }

  const user = await getSessionUser();
  const { data: campaign, error: cErr } = await db
    .from("campaigns")
    .insert({
      subject, body_md: body,
      locale: locale === "all" ? null : locale,
      status: "sending",
      recipient_count: recipients.length,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (cErr || !campaign) {
    return NextResponse.json({ error: cErr?.message ?? "批次创建失败" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    const html = campaignHtml({
      body,
      token: r.unsubscribe_token as string,
      locale: r.locale === "en" ? "en" : "zh",
    });
    try {
      await sendOne(r.email, subject, html);
      sent++;
      await db.from("campaign_sends").insert({
        campaign_id: campaign.id, waitlist_id: r.id, email: r.email, status: "sent",
      });
      await db.from("waitlist")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", r.id).is("notified_at", null);
    } catch (e) {
      failed++;
      const m = e instanceof Error ? e.message : "未知错误";
      if (errors.length < 5) errors.push(`${r.email}: ${m}`);
      await db.from("campaign_sends").insert({
        campaign_id: campaign.id, waitlist_id: r.id, email: r.email,
        status: "failed", error_text: m,
      });
    }
    // Resend 免费档限速，串行 + 间隔最稳妥
    await new Promise((res) => setTimeout(res, 120));
  }

  await db.from("campaigns").update({
    status: failed === recipients.length ? "failed" : "sent",
    sent_count: sent,
    failed_count: failed,
    error_text: errors.length ? errors.join(" | ") : null,
    sent_at: new Date().toISOString(),
  }).eq("id", campaign.id);

  return NextResponse.json({ ok: true, campaignId: campaign.id, sent, failed, errors });
}
