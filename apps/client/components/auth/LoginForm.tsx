"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, User } from "@/types";

const DEVICE = {
  deviceId:   typeof window !== "undefined" ? (localStorage.getItem("did") ?? crypto.randomUUID()) : "web",
  deviceName: "Web Browser",
  deviceType: "web",
};
if (typeof window !== "undefined") localStorage.setItem("did", DEVICE.deviceId);

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const { setAuth } = useAuthStore();
  const t = useT();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setError(""); setLoading(true);
    try {
      const res = await api.post<ApiResponse<{ accessToken: string }>>("/api/auth/login", {
        emailOrPhone: identifier, password, ...DEVICE,
      });
      const me = await api.get<ApiResponse<User>>("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
      });
      setAuth(me.data.data, res.data.data.accessToken);
      router.push(callbackUrl);
    } catch (e) { setError(getApiError(e).message); }
    finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ url: string }>>("/api/auth/google/url", {
        params: { callbackUrl, deviceId: DEVICE.deviceId },
      });
      window.location.href = res.data.data.url;
    } catch (e) {
      setError(getApiError(e).message);
      setLoading(false);
    }
  }

  const registerHref = `/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="space-y-5">
      {/* TAB SWITCHER — Нэвтрэх / Бүртгүүлэх тод харагдана */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-card border border-app">
        <button type="button"
          className="py-2.5 rounded-lg text-sm font-bold bg-accent text-white shadow-sm">
          {t("login")}
        </button>
        <Link href={registerHref}
          className="py-2.5 rounded-lg text-sm font-bold text-center text-sub hover:text-app transition-colors">
          {t("register")}
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] md:text-[28px] font-bold text-app tracking-tight">{t("login")}</h1>
      </div>

      {/* Google */}
      <button onClick={handleGoogleLogin} disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl
          bg-white hover:bg-gray-50 active:scale-[0.98] text-[#1e293b] text-sm font-semibold
          transition-all disabled:opacity-50 shadow-sm">
        <GoogleIcon />
        {t("google_login")}
      </button>

      <Divider label={t("divider_or")} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("phone_or_email")}>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="99000000 / name@email.com"
            autoFocus
            className={inputCls}
          />
        </Field>

        <Field label={t("password")}
          right={
            <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-hover transition-colors">
              {t("forgot_link")}
            </Link>
          }>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputCls} pr-12`}
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors">
              {showPw ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </Field>

        {error && <ErrBox msg={error} onDismiss={() => setError("")} />}

        <button type="submit" disabled={loading || !identifier || !password}
          className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-[0.98]
            text-white font-semibold text-sm transition-all
            disabled:opacity-35 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
          {loading ? <Spin label={t("login_loading")} /> : t("login")}
        </button>
      </form>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────

export const inputCls = [
  "w-full px-4 py-3.5 rounded-xl border input-base",
  "text-sm focus:ring-2 focus:ring-accent/15 transition-all",
].join(" ");

export function Field({ label, right, children }: {
  label: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted">{label}</label>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-strong)" }} />
      <span className="text-xs text-muted uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-strong)" }} />
    </div>
  );
}

export function ErrBox({ msg, onDismiss }: { msg: string; onDismiss?: () => void }) {
  return (
    <div key={msg} className="animate-shake flex items-start gap-3 px-4 py-3.5 bg-red-500/12 border border-red-500/25 rounded-xl">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="flex-1 text-sm text-red-300 leading-snug font-medium">{msg}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-500/50 hover:text-red-400 transition-colors shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export function Spin({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      {label}
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function Eye() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EyeOff() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
