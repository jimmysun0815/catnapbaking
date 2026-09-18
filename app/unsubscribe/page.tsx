import Link from "next/link";
import { serviceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 退订页。
 *
 * 用 GET 直接退订是有意为之：CASL 要求退订"简单、无需额外步骤"，
 * 而部分邮件客户端会预取链接，所以退订必须幂等——重复访问不报错、不改状态。
 * 令牌是随机 uuid，不含邮箱明文，转发出去也泄露不了身份。
 */
export default async function UnsubscribePage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  let state: "ok" | "already" | "bad" | "unavailable" = "bad";

  if (token) {
    const db = serviceClient();
    if (!db) {
      state = "unavailable";
    } else {
      const { data: row } = await db
        .from("waitlist")
        .select("id, unsubscribed_at")
        .eq("unsubscribe_token", token)
        .maybeSingle();

      if (row) {
        if (row.unsubscribed_at) {
          state = "already";
        } else {
          const { error } = await db
            .from("waitlist")
            .update({ unsubscribed_at: new Date().toISOString() })
            .eq("id", row.id);
          state = error ? "unavailable" : "ok";
        }
      }
    }
  }

  const copy = {
    ok: { h: "已为您退订", p: "之后不会再收到我们的邮件。如果是误操作，重新在网站上留邮箱即可。" },
    already: { h: "您已经退订过了", p: "这个邮箱不在我们的发送名单里，不会再收到邮件。" },
    bad: { h: "链接无效", p: "退订链接可能不完整或已失效。请直接回复我们收到的邮件，我们会手动处理。" },
    unavailable: { h: "暂时处理不了", p: "系统出了点问题，请稍后再试一次，或直接回复邮件告诉我们。" },
  }[state];

  return (
    <div className="site zh-site">
      <main className="page-shell">
        <div className="page-head">
          <div className="section-index">unsubscribe</div>
          <h1>{copy.h}</h1>
        </div>
        <p className="admin-sub" style={{ marginTop: 18 }}>{copy.p}</p>
        <p style={{ marginTop: 28 }}>
          <Link className="text-link" href="/zh">返回首页</Link>
        </p>
      </main>
    </div>
  );
}
