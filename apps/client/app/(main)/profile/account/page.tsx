"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, User } from "@/types";

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const t = useT();

  /* Үндсэн мэдээлэл */
  const [name,    setName]    = useState(user?.name ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  /* Нууц үг солих */
  const [curPw,    setCurPw]  = useState("");
  const [newPw,    setNewPw]  = useState("");
  const [confPw,   setConfPw] = useState("");
  const [showPw,   setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved,  setPwSaved] = useState(false);
  const [pwError,  setPwError] = useState("");

  useEffect(() => {
    if (!user) router.push(`/login?callbackUrl=/profile/account`);
    else setName(user.name ?? "");
  }, [user, router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await api.patch<ApiResponse<User>>("/api/auth/profile", { name });
      setAuth(res.data.data, "");
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(getApiError(e).message); }
    finally { setSaving(false); }
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwError(t("pw_min_8")); return; }
    if (newPw !== confPw) { setPwError(t("pw_mismatch")); return; }
    setPwSaving(true); setPwError(""); setPwSaved(false);
    try {
      await api.post("/api/auth/change-password", { currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw(""); setConfPw("");
      setPwSaved(true); setTimeout(() => setPwSaved(false), 2500);
    } catch (e) { setPwError(getApiError(e).message); }
    finally { setPwSaving(false); }
  }

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-xl">

      {/* ── Үндсэн мэдээлэл ─────────────────── */}
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-app">{t("account_info")}</h1>
          <p className="text-muted text-sm mt-1">{user.phone ?? user.email}</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Field label={t("name")}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("name")} autoFocus
              className="w-full px-4 py-3 rounded-xl bg-input border border-app text-app
                placeholder:text-muted text-sm focus:outline-none focus:border-brand transition-all" />
          </Field>

          <Field label={t("account_id")}>
            <input type="text" value={user.phone ?? user.email ?? ""} disabled
              className="w-full px-4 py-3 rounded-xl bg-input border border-app text-muted
                text-sm cursor-not-allowed opacity-60" />
          </Field>

          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || !name.trim() || name === user.name}
              className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold
                rounded-xl disabled:opacity-40 transition-all">
              {saving ? t("saving") : saved ? t("saved_ok") : t("save")}
            </button>
            <button type="button" onClick={() => setName(user.name ?? "")}
              className="px-6 py-2.5 text-sm text-muted hover:text-app transition-colors">
              {t("cancel")}
            </button>
          </div>
        </form>
      </section>

      {/* ── Нууц үг & Аюулгүй байдал ─────────── */}
      <section className="space-y-4 pt-2 border-t border-app">
        <h2 className="text-base font-bold text-app">{t("security")}</h2>

        {!user.password ? (
          <div className="px-4 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-sm text-yellow-500">
            {t("pw_no_set")}
          </div>
        ) : (
          <form onSubmit={handleChangePw} className="space-y-4">
            {([
              { key: "current_pw", val: curPw, set: setCurPw },
              { key: "new_pw",     val: newPw, set: setNewPw },
              { key: "confirm_pw", val: confPw,set: setConfPw },
            ] as const).map(({ key, val, set }) => (
              <Field key={key} label={t(key)}>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={val}
                    onChange={(e) => set(e.target.value as string)} placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-input border border-app text-app
                      placeholder:text-muted text-sm focus:outline-none focus:border-brand transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPw
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </Field>
            ))}

            {/* Strength */}
            {newPw.length > 0 && (
              <div className="flex gap-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={cn("flex-1 h-1 rounded-full transition-all",
                    newPw.length >= i*3
                      ? i===1 ? "bg-red-500" : i===2 ? "bg-yellow-500" : i===3 ? "bg-blue-500" : "bg-emerald-500"
                      : "bg-app")} />
                ))}
              </div>
            )}

            {pwError && <ErrorBox>{pwError}</ErrorBox>}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={pwSaving || !curPw || newPw.length < 8}
                className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold
                  rounded-xl disabled:opacity-40 transition-all">
                {pwSaving ? t("saving") : pwSaved ? t("changed_ok") : t("change_pw")}
              </button>
              <button type="button"
                onClick={() => { setCurPw(""); setNewPw(""); setConfPw(""); setPwError(""); }}
                className="px-6 py-2.5 text-sm text-muted hover:text-app transition-colors">
                {t("cancel")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl text-sm text-[var(--danger)]">
      {children}
    </div>
  );
}
