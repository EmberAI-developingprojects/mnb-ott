"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/store/settingsStore";
import { OtpInput } from "@/components/auth/OtpInput";
import type { OtpInputRef } from "@/components/auth/OtpInput";
import api, { getApiError } from "@/lib/api";
import { inputCls, Field, ErrBox, Spin } from "@/components/auth/LoginForm";

type Step = "identifier" | "otp" | "newpw" | "done";

function ForgotForm() {
  const router = useRouter();
  const t = useT();

  const otpRef = useRef<OtpInputRef>(null);
  const [step, setStep]         = useState<Step>("identifier");
  const [identifier, setId]     = useState("");
  const [otp, setOtp]           = useState("");
  const [newPw, setNewPw]       = useState("");
  const [confirmPw, setConfPw]  = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [countdown, setCountdown] = useState(0);

  function startCountdown() {
    setCountdown(60);
    const timer = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) return;
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { emailOrPhone: identifier });
      setStep("otp"); startCountdown();
    } catch (e) { setError(getApiError(e).message); }
    finally { setLoading(false); }
  }

  function handleOtpComplete(code: string) {
    setOtp(code); setStep("newpw");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setError(t("pw_min_8")); return; }
    if (newPw !== confirmPw) { setError(t("pw_mismatch")); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { emailOrPhone: identifier, otp, newPassword: newPw });
      setStep("done");
    } catch (e) { setError(getApiError(e).message); }
    finally { setLoading(false); }
  }

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-app transition-colors mb-5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      {t("back")}
    </button>
  );

  // ── Step 1: identifier ────────────────────────────
  if (step === "identifier") return (
    <div className="space-y-5">
      <div>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-app transition-colors mb-5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {t("back")}
        </Link>
        <h1 className="text-[26px] font-bold text-app tracking-tight">{t("pw_reset_title")}</h1>
        <p className="text-muted text-sm mt-1">{t("pw_reset_desc")}</p>
      </div>

      <form onSubmit={handleSendOtp} className="space-y-4">
        <Field label={t("phone_or_email")}>
          <input type="text" value={identifier} onChange={(e) => setId(e.target.value)}
            placeholder="99000000 / name@email.com" autoFocus className={inputCls} />
        </Field>

        {error && <ErrBox msg={error} />}

        <button type="submit" disabled={loading || !identifier}
          className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-[0.98]
            text-white font-semibold text-sm transition-all disabled:opacity-35 shadow-lg shadow-blue-900/20">
          {loading ? <Spin label={t("sending")} /> : t("otp_get")}
        </button>
      </form>
    </div>
  );

  // ── Step 2: OTP ───────────────────────────────────
  if (step === "otp") return (
    <div className="space-y-6">
      <div>
        <BackBtn onClick={() => { setStep("identifier"); setError(""); }} />
        <h1 className="text-[22px] font-bold text-app">{t("otp_title")}</h1>
        <p className="text-sm text-muted mt-1.5">
          <span className="text-sub font-medium">{identifier}</span>{t("otp_sent_desc")}
        </p>
      </div>

      <OtpInput ref={otpRef} onComplete={handleOtpComplete} hasError={!!error} />

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted">
            <span className="font-mono text-sub">{String(countdown).padStart(2, "0")}</span>{t("otp_resend_in")}
          </p>
        ) : (
          <button onClick={(e) => handleSendOtp(e as unknown as React.FormEvent)}
            className="text-sm text-accent hover:text-accent-hover transition-colors font-medium">
            {t("otp_resend")}
          </button>
        )}
      </div>

      {error && <ErrBox msg={error} onDismiss={() => { setError(""); otpRef.current?.reset(); }} />}
    </div>
  );

  // ── Step 3: New password ──────────────────────────
  if (step === "newpw") return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold text-app tracking-tight">{t("pw_new_label")}</h1>
        <p className="text-muted text-sm mt-1">{t("pw_min_8")}</p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <Field label={t("pw_new_label")}>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="••••••••" autoFocus className={`${inputCls} pr-12`} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
              </svg>
            </button>
          </div>
        </Field>

        <Field label={t("confirm_pw")}>
          <input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfPw(e.target.value)}
            placeholder="••••••••" className={inputCls} />
        </Field>

        {error && <ErrBox msg={error} />}

        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-[0.98]
            text-white font-semibold text-sm transition-all disabled:opacity-35 shadow-lg shadow-blue-900/20">
          {loading ? <Spin label={t("saving")} /> : t("pw_update")}
        </button>
      </form>
    </div>
  );

  // ── Step 4: Done ──────────────────────────────────
  return (
    <div className="text-center space-y-5 py-4">
      <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-app">{t("pw_updated_ok")}</h2>
        <p className="text-sm text-muted mt-1.5">{t("pw_updated_sub")}</p>
      </div>
      <button onClick={() => router.push("/login")}
        className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all">
        {t("login")}
      </button>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotForm /></Suspense>;
}
