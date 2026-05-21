"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { OtpInput } from "@/components/auth/OtpInput";
import type { OtpInputRef } from "@/components/auth/OtpInput";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, User } from "@/types";
import { inputCls, Field, ErrBox, Spin } from "@/components/auth/LoginForm";

type Step = "form" | "otp" | "done";

const DEVICE = {
  deviceId:   typeof window !== "undefined" ? (localStorage.getItem("did") ?? crypto.randomUUID()) : "web",
  deviceName: "Web Browser", deviceType: "web",
};
if (typeof window !== "undefined") localStorage.setItem("did", DEVICE.deviceId);

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const { setAuth } = useAuthStore();
  const t = useT();
  const otpRef = useRef<OtpInputRef>(null);

  const [step, setStep]       = useState<Step>("form");
  const [name, setName]       = useState("");
  const [identifier, setId]   = useState("");
  const [password, setPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [fieldErr, setFE]     = useState<Record<string, string>>({});
  const [countdown, setCd]    = useState(0);

  function startCountdown() {
    setCd(60);
    const t = setInterval(() => setCd((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())         e.name       = t("name_required");
    if (!identifier.trim())   e.identifier = t("id_required");
    if (password.length < 8)  e.password   = t("pw_min_8");
    if (password !== confirm) e.confirm    = t("pw_mismatch");
    setFE(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/register", { name, emailOrPhone: identifier, password });
      setStep("otp"); startCountdown();
    } catch (err) { setError(getApiError(err).message); }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp(code: string) {
    setError(""); setLoading(true);
    try {
      const res = await api.post<ApiResponse<{ accessToken: string }>>("/api/auth/register/verify", {
        emailOrPhone: identifier, otp: code, ...DEVICE,
      });
      const me = await api.get<ApiResponse<User>>("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
      });
      setAuth(me.data.data, res.data.data.accessToken);
      router.push(callbackUrl);
    } catch (err) { setError(getApiError(err).message); }
    finally { setLoading(false); }
  }

  async function resendOtp() {
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/register", { name, emailOrPhone: identifier, password });
      startCountdown();
    } catch (err) { setError(getApiError(err).message); }
    finally { setLoading(false); }
  }

  // ── OTP алхам ──────────────────────────────────────
  if (step === "otp") return (
    <div className="space-y-6">
      <button onClick={() => { setStep("form"); setError(""); }}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-app transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {t("back")}
      </button>

      <div>
        <h1 className="text-[24px] font-bold text-app">{t("verify_title")}</h1>
        <p className="text-sm text-muted mt-1.5">
          <span className="text-sub font-medium">{identifier}</span>{t("otp_sent_desc")}
        </p>
      </div>

      <OtpInput ref={otpRef} onComplete={handleVerifyOtp} disabled={loading} hasError={!!error} />

      {loading && (
        <div className="flex justify-center text-sm text-muted">
          <Spin label={t("validating")} />
        </div>
      )}

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted">
            <span className="font-mono text-sub">{String(countdown).padStart(2, "0")}</span>{t("otp_resend_in")}
          </p>
        ) : (
          <button onClick={resendOtp} disabled={loading}
            className="text-sm text-[#0046A5] hover:text-blue-400 transition-colors font-medium">
            {t("otp_resend")}
          </button>
        )}
      </div>

      {error && <ErrBox msg={error} onDismiss={() => { setError(""); otpRef.current?.reset(); }} />}
    </div>
  );

  // ── Бүртгэлийн форм ────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="space-y-1 pb-1">
        <h1 className="text-[26px] font-bold text-app tracking-tight">{t("register")}</h1>
        <p className="text-muted text-sm">
          {t("has_account")}{" "}
          <Link href={`/login${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="text-[#0046A5] hover:text-blue-400 transition-colors font-medium">
            {t("login")}
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("name")} right={fieldErr.name && <span className="text-xs text-red-400">{fieldErr.name}</span>}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t("name")} autoFocus
            className={`${inputCls}${fieldErr.name ? " border-red-500/50" : ""}`} />
        </Field>

        <Field label={t("phone_or_email")} right={fieldErr.identifier && <span className="text-xs text-red-400">{fieldErr.identifier}</span>}>
          <input type="text" value={identifier} onChange={(e) => setId(e.target.value)}
            placeholder="99000000 / name@email.com"
            className={`${inputCls}${fieldErr.identifier ? " border-red-500/50" : ""}`} />
        </Field>

        <Field label={t("password")} right={fieldErr.password && <span className="text-xs text-red-400">{fieldErr.password}</span>}>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPw(e.target.value)}
              placeholder={t("pw_min_8")}
              className={`${inputCls} pr-12${fieldErr.password ? " border-red-500/50" : ""}`} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
              </svg>
            </button>
          </div>
        </Field>

        {password.length > 0 && (
          <div className="flex gap-1 -mt-1">
            {[1,2,3,4].map((i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                password.length >= i*3
                  ? i===1 ? "bg-red-500" : i===2 ? "bg-yellow-500" : i===3 ? "bg-blue-500" : "bg-emerald-500"
                  : "bg-[var(--border-strong)]"
              }`} />
            ))}
          </div>
        )}

        <Field label={t("confirm_pw")} right={fieldErr.confirm && <span className="text-xs text-red-400">{fieldErr.confirm}</span>}>
          <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={`${inputCls}${fieldErr.confirm ? " border-red-500/50" : ""}`} />
        </Field>

        {error && <ErrBox msg={error} onDismiss={() => setError("")} />}

        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#0046A5] hover:bg-[#0055c8] active:scale-[0.98]
            text-white font-semibold text-sm transition-all
            disabled:opacity-35 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
          {loading ? <Spin label={t("validating")} /> : `${t("continue_btn")} →`}
        </button>
      </form>

      <p className="text-[11px] text-muted text-center leading-relaxed">{t("agree_terms")}</p>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
