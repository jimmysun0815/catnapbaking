"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/types";

/**
 * 预热期的邮箱候补名单。
 * CASL 要求商业邮件有明示同意，所以同意文案原文会跟着邮箱一起存进数据库，
 * 以后真被投诉了拿得出证据。改这里的文案，存证也会跟着变。
 */
const CONSENT = {
  zh: "本人同意 Cat Nap Baking Ltd. 以邮件发送开业通知、新品与优惠信息，并可随时退订。",
  en: "I agree to receive emails from Cat Nap Baking Ltd. about our opening, new products and promotions. I can unsubscribe at any time.",
};

export function Waitlist({ locale, source = "home" }: { locale: Locale; source?: string }) {
  const zh = locale === "zh";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "already" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setMsg(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale, source, consentText: CONSENT[locale] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setState(data.already ? "already" : "done");
    } catch {
      setState("error");
      setMsg(zh ? "没提交上，请稍后再试。" : "Something went wrong. Try again in a moment.");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <div className="waitlist-done">
        <div className="waitlist-tick" aria-hidden="true">✦</div>
        <h3>
          {state === "already"
            ? (zh ? "你已经在名单里了" : "You're already on the list")
            : (zh ? "记下了" : "You're on the list")}
        </h3>
        <p>
          {zh
            ? "开业前我们将以邮件通知您。您可随时退订。"
            : "We'll email you before we open. You can unsubscribe at any time."}
        </p>
      </div>
    );
  }

  return (
    <form className="waitlist" onSubmit={submit}>
      <label className="auth-field-label" htmlFor="wl-email">
        {zh ? "邮箱" : "Email"}
      </label>
      <div className="waitlist-row">
        <input
          id="wl-email" type="email" required value={email} autoComplete="email"
          placeholder="you@example.com" className="field"
          onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
        />
        <button type="submit" className="waitlist-cta" disabled={state === "busy" || !email.includes("@")}>
          {state === "busy" ? (zh ? "提交中…" : "Sending…") : zh ? "订阅" : "Notify me"}
          <ArrowUpRight size={15} />
        </button>
      </div>
      <p className="waitlist-consent">{CONSENT[locale]}</p>
      {msg && <p className="alert">{msg}</p>}
    </form>
  );
}
