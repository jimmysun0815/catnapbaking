"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Locale } from "@/lib/types";

/**
 * 两种登录方式，都不设密码：
 *   Google OAuth — 一键
 *   邮箱验证码   — 给不用 Google 的顾客兜底
 * 登录卡在付款之前，每张订单才能绑到账户，收据和取货提醒才发得准。
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = supabaseBrowser();
  const demo = !supabase;

  async function google() {
    if (!supabase) {
      setMsg(zh ? "演示模式：尚未配置 Supabase。" : "Demo mode: Supabase not configured.");
      return;
    }
    // 跳回 /auth/callback 换会话，next 指明换完去哪
    const next = new URLSearchParams(window.location.search).get("next") ?? `/${locale}/account`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  async function sendCode() {
    if (!supabase) {
      setMsg(zh ? "演示模式：验证码不会真的发出。" : "Demo mode: no code will be sent.");
      setStage("code");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg(error.message);
    else { setStage("code"); setMsg(zh ? "验证码已发送，请查收邮件。" : "Code sent. Check your email."); }
  }

  async function verify() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const next = new URLSearchParams(window.location.search).get("next") ?? `/${locale}/account`;
    window.location.href = next;
  }

  return (
    <section className="auth-shell">
      <div className="section-index">{zh ? "登录" : "sign in"}</div>
      <h1>{zh ? "先认个门" : "Let us know you"}</h1>
      <p className="auth-lede">
        {zh
          ? "下单前需要登录，这样收据和取货提醒才发得到你。不用设密码。"
          : "Sign in before ordering, so your receipt and pickup reminder reach you. No password needed."}
      </p>

      <button type="button" className="auth-oauth" onClick={google}>
        {zh ? "用 Google 账号登录" : "Continue with Google"}
      </button>

      <div className="auth-divider">{zh ? "或用邮箱验证码" : "or email a code"}</div>

      {stage === "email" ? (
        <>
          <label className="auth-field-label" htmlFor="email">{zh ? "邮箱" : "Email"}</label>
          <input id="email" type="email" className="field" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button type="button" className="auth-submit" onClick={sendCode}
            disabled={!email.includes("@") || busy}>
            {busy ? (zh ? "发送中…" : "Sending…") : zh ? "发送验证码" : "Send code"}
          </button>
        </>
      ) : (
        <>
          <label className="auth-field-label" htmlFor="code">{zh ? "6 位验证码" : "6-digit code"}</label>
          <input id="code" inputMode="numeric" maxLength={6} className="field auth-otp" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="auth-submit" onClick={verify}
            disabled={code.length !== 6 || busy || demo}>
            {zh ? "登录" : "Sign in"}
          </button>
          <button type="button" className="link-quiet" style={{ marginTop: 16, background: "none", border: 0 }}
            onClick={() => { setStage("email"); setMsg(null); }}>
            {zh ? "换个邮箱" : "Use a different email"}
          </button>
        </>
      )}

      {msg && <p className="alert" style={{ color: "inherit", opacity: .75 }}>{msg}</p>}

      <p className="auth-foot">
        {zh
          ? "我们只用邮箱发订单相关邮件。营销邮件需要你另行勾选同意，随时可退订。"
          : "We use your email for order messages only. Marketing needs separate consent and you can unsubscribe any time."}
      </p>
    </section>
  );
}
