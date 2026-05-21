"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";

export default function SecurityPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [curPw,   setCurPw]   = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [confPw,  setConfPw]  = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confPw) { setError(t("error_generic") + " — нууц үг таарахгүй байна"); return; }
    if (newPw.length < 8)  { setError(t("new_pw")); return; }
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.post("/api/auth/change-password", { currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw(""); setConfPw("");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(getApiError(e).message); }
    finally { setSaving(false); }
  }

  const EyeToggle = () => (
    <button type="button" onClick={() => setShowPw(!showPw)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {showPw
          ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
               <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
               <line x1="1" y1="1" x2="23" y2="23"/></>
          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
      </svg>
    </button>
  );

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-app">{t("security")}</h1>
        <p className="text-muted text-sm mt-1">{t("change_pw")}</p>
      </div>

      {!user?.password && (
        <div className="px-4 py-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl text-sm text-yellow-500">
          {t("pw_no_set")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {([
          { key: "current_pw", val: curPw, set: setCurPw },
          { key: "new_pw",     val: newPw, set: setNewPw },
          { key: "confirm_pw", val: confPw,set: setConfPw },
        ] as const).map(({ key, val, set }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t(key)}</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={val}
                onChange={(e) => set(e.target.value as string)} placeholder="••••••••"
                className="w-full px-4 py-3 pr-10 rounded-xl bg-input border border-app text-app
                  placeholder:text-muted text-sm focus:outline-none focus:border-[#0046A5]/60 transition-all" />
              <EyeToggle />
            </div>
          </div>
        ))}

        {/* Strength */}
        {newPw.length > 0 && (
          <div className="flex gap-1">
            {[1,2,3,4].map((i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                newPw.length >= i*3 ? i===1?"bg-red-500":i===2?"bg-yellow-500":i===3?"bg-blue-500":"bg-emerald-500" : "bg-app"
              }`} />
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-[#CF1E28]/10 border border-[#CF1E28]/20 rounded-xl text-sm text-[#CF1E28]">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving || !curPw || newPw.length < 8}
            className="px-6 py-2.5 bg-[#0046A5] hover:bg-blue-600 text-white text-sm font-semibold
              rounded-xl disabled:opacity-40 transition-all">
            {saving ? t("saving") : saved ? t("changed_ok") : t("change_pw")}
          </button>
          <button type="button" onClick={() => { setCurPw(""); setNewPw(""); setConfPw(""); setError(""); }}
            className="px-6 py-2.5 text-sm text-muted hover:text-app transition-colors">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
