import { serviceClient } from "./supabase";
import { formatCents } from "./money";

/**
 * 邮件走 Resend。
 * 注意：Supabase 自带的验证码邮件每小时只有几封额度，
 * 上线前必须在 Supabase 后台把 SMTP 换成 Resend，否则开单当天顾客登录不了。
 */
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "Cat Nap <orders@catnapbaking.ca>";

async function send(to: string, subject: string, html: string) {
  if (!RESEND_KEY) {
    console.log(`[email:demo] → ${to} | ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

/** 品牌收据邮件。Stripe 自带收据要在后台关掉，避免顾客收到两封 */
export async function sendReceipt(orderId: string) {
  const db = serviceClient();
  if (!db) return;

  const { data: order } = await db
    .from("orders").select("*, order_items(*), batches(*), pickup_slots(*)")
    .eq("id", orderId).single();
  if (!order?.contact_email) return;

  const zh = true; // 后续按 profile.locale 决定
  const items = (order.order_items ?? []) as Array<{
    quantity: number; unit_price_cents: number; variant_name_zh: string; variant_name_en: string;
  }>;

  const rows = items.map((i) =>
    `<tr>
       <td style="padding:6px 0">${zh ? i.variant_name_zh : i.variant_name_en} × ${i.quantity}</td>
       <td style="padding:6px 0;text-align:right">${formatCents(i.unit_price_cents * i.quantity)}</td>
     </tr>`
  ).join("");

  const slot = order.pickup_slots;
  const when = slot
    ? `${new Date(slot.starts_at).toLocaleString("zh-CN")} – ${new Date(slot.ends_at).toLocaleTimeString("zh-CN")}`
    : "另行通知";

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#2A2A26">
    <table role="presentation" style="border-collapse:collapse;margin-bottom:18px">
      <tr>
        <td style="padding-right:10px">
          <img src="${SITE}/brand/cat-nap-mark-128.png" width="42" height="42" alt=""
               style="display:block;border-radius:50%;background:#e9bb67" />
        </td>
        <td style="font-family:Georgia,serif;font-size:15px;color:#33241e;letter-spacing:.06em">
          不太甜研究所<br>
          <span style="font-size:9px;letter-spacing:.14em;color:#8a6853">CAT NAP BAKING</span>
        </td>
      </tr>
    </table>
    <h1 style="font-size:20px;margin:4px 0 16px">感谢下单，${order.contact_name || ""}</h1>
    <p style="font-size:14px">订单号 <strong>${order.order_no}</strong></p>
    <table style="width:100%;border-top:1px solid #D9D5CA;border-bottom:1px solid #D9D5CA;font-size:14px;margin:12px 0">
      ${rows}
      <tr><td style="padding:8px 0"><strong>合计</strong></td>
          <td style="padding:8px 0;text-align:right"><strong>${formatCents(order.total_cents)}</strong></td></tr>
    </table>
    <p style="font-size:14px"><strong>取货时间</strong><br>${when}</p>
    <p style="font-size:14px"><strong>取货地点</strong><br>${order.batches?.pickup_address ?? ""}</p>
    <p style="font-size:12px;color:#726F68;border-top:1px solid #D9D5CA;padding-top:12px;margin-top:20px">
      6 个及以上整售，GST 零税率。<br>
      Cat Nap Baking Ltd. · Richmond, British Columbia
    </p>
  </div>`;

  await send(order.contact_email, `订单确认 ${order.order_no} · 不太甜研究所`, html);
}
