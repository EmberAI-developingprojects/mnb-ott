"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, User } from "@/types";

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const t = useT();

  const [name,    setName]    = useState(user?.name ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!user) router.push(`/login?callbackUrl=/profile`);
    else setName(user.name ?? "");
  }, [user, router]);

  async function handleSave(e: React.FormEvent) {
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

  if (!user) return null;

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-app">{t("account_info")}</h1>
        <p className="text-muted text-sm mt-1">{user.phone ?? user.email}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t("name")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t("name")} autoFocus
            className="w-full px-4 py-3 rounded-xl bg-input border border-app text-app
              placeholder:text-muted text-sm focus:outline-none focus:border-[#0046A5]/60 transition-all" />
        </div>

        {/* Account address (readonly) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t("account_id")}</label>
          <input type="text" value={user.phone ?? user.email ?? ""} disabled
            className="w-full px-4 py-3 rounded-xl bg-input border border-app text-muted
              text-sm cursor-not-allowed opacity-60" />
        </div>

        {error && (
          <div className="px-4 py-3 bg-[#CF1E28]/10 border border-[#CF1E28]/20 rounded-xl text-sm text-[#CF1E28]">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving || !name.trim() || name === user.name}
            className="px-6 py-2.5 bg-[#0046A5] hover:bg-blue-600 text-white text-sm font-semibold
              rounded-xl disabled:opacity-40 transition-all">
            {saving ? t("saving") : saved ? t("saved_ok") : t("save")}
          </button>
          <button type="button" onClick={() => setName(user.name ?? "")}
            className="px-6 py-2.5 text-sm text-muted hover:text-app transition-colors">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
