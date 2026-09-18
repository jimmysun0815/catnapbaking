import { SITE_URL } from "./site";

/**
 * 商业邮件的合规要素。
 *
 * CASL（加拿大反垃圾邮件法）要求每封商业电子邮件必须包含：
 *   1. 发件人身份（名称）
 *   2. 可联系到发件人的地址 —— 包含有效的实体邮寄地址
 *   3. 可用的退订方式，且退订链接自发送起至少 60 天内有效
 *
 * 实体地址不能省。填在 MARKETING_FROM_ADDRESS 环境变量里，
 * 没填时群发接口会直接拒绝发送，而不是发出一封不合规的邮件。
 */
export const SENDER_NAME = "Cat Nap Baking Ltd.";

/** 实体邮寄地址。必须是真实地址，用环境变量而不是写死，方便搬家后改 */
export const SENDER_ADDRESS = process.env.MARKETING_FROM_ADDRESS ?? "";

export const marketingConfigured = Boolean(
  process.env.RESEND_API_KEY && SENDER_ADDRESS.trim()
);

/** 缺什么就说缺什么，别让运营对着一个笼统的失败发呆 */
export function marketingBlockers(): string[] {
  const out: string[] = [];
  if (!process.env.RESEND_API_KEY) out.push("RESEND_API_KEY 未配置，邮件发不出去");
  if (!SENDER_ADDRESS.trim()) {
    out.push("MARKETING_FROM_ADDRESS 未配置。CASL 要求商业邮件带实体邮寄地址，缺了不能群发");
  }
  return out;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** 极简 markdown：只支持空行分段，够写一封通知了，也避免引入解析库 */
function paragraphs(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.85">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * 群发邮件的 HTML。页脚三要素齐全，不可省略。
 */
export function campaignHtml(opts: {
  body: string;
  token: string;
  locale: "zh" | "en";
}): string {
  const zh = opts.locale === "zh";
  const unsub = unsubscribeUrl(opts.token);
  const why = zh
    ? "您收到这封邮件，是因为您在我们网站上留下了邮箱并同意接收通知。"
    : "You are receiving this because you signed up for updates on our website.";
  const unsubLabel = zh ? "退订" : "Unsubscribe";

  return `<!doctype html><html lang="${zh ? "zh-CN" : "en-CA"}"><body style="margin:0;background:#f5f0e6">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#33241e;font-size:15px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
      <img src="${SITE_URL}/brand/cat-nap-mark-128.png" width="38" height="38" alt="" style="border-radius:50%" />
      <strong style="font-size:15px;letter-spacing:.04em">不太甜研究所 · Cat Nap Baking</strong>
    </div>
    ${paragraphs(opts.body)}
    <hr style="border:0;border-top:1px solid rgba(51,36,30,.18);margin:32px 0 16px" />
    <div style="color:#826b5a;font-size:11.5px;line-height:1.8">
      <p style="margin:0 0 6px">${why}</p>
      <p style="margin:0 0 6px">${escapeHtml(SENDER_NAME)}${SENDER_ADDRESS ? ` · ${escapeHtml(SENDER_ADDRESS)}` : ""}</p>
      <p style="margin:0"><a href="${unsub}" style="color:#b65f3e">${unsubLabel}</a></p>
    </div>
  </div>
</body></html>`;
}
