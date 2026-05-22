"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PreferencesPage() {
  const router = useRouter();
  const { lang, theme, setLang, setTheme } = useSettingsStore();
  const { clearAuth } = useAuthStore();
  const t = useT();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText]       = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  async function handleDelete() {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete("/api/auth/account", { data: { confirm: "DELETE" } });
      clearAuth();
      router.push("/");
    } catch (e) {
      setDeleteError(getApiError(e).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-xl font-bold text-app">{t("prefs_title")}</h1>

      {/* Хэл */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-app">{t("prefs_language")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["mn", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={cn(
                "px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left",
                lang === l
                  ? "border-accent bg-accent-soft text-app"
                  : "border-app bg-card hover:bg-card-hover text-sub",
              )}>
              <div className="flex items-center justify-between">
                <span>{l === "mn" ? "Монгол" : "English"}</span>
                {lang === l && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Дэлгэцийн горим */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-app">{t("prefs_theme")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["dark", "light"] as const).map((th) => (
            <button key={th} onClick={() => setTheme(th)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all overflow-hidden",
                theme === th ? "border-accent bg-accent-soft" : "border-app bg-card hover:bg-card-hover",
              )}>
              <div className={cn(
                "h-14 rounded-lg mb-3 border flex items-center px-2 gap-1.5",
                th === "dark" ? "bg-[#0e0f14] border-white/10" : "bg-[#f5f5f0] border-black/10",
              )}>
                <span className={cn("w-2 h-2 rounded-full", th === "dark" ? "bg-white/30" : "bg-black/30")} />
                <span className={cn("w-2 h-2 rounded-full", th === "dark" ? "bg-white/20" : "bg-black/20")} />
                <span className={cn("flex-1 h-1.5 rounded-full", th === "dark" ? "bg-white/15" : "bg-black/15")} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-app">
                  {th === "dark" ? t("prefs_theme_dark") : t("prefs_theme_light")}
                </span>
                {theme === th && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-app">
          {lang === "mn" ? "Үзлэгийн тохиргоо" : "Playback"}
        </h2>
        <ToggleRow label={t("prefs_autoplay")} storageKey="pref_autoplay" defaultOn />
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-app">{t("notifications")}</h2>
        <ToggleRow label={t("prefs_notify_email")} storageKey="pref_notify_email" defaultOn />
        <ToggleRow label={t("prefs_notify_promo")} storageKey="pref_notify_promo" defaultOn={false} />
      </section>

      {/* DANGER ZONE — бүртгэл устгах */}
      <section className="space-y-3 pt-6 border-t border-app">
        <div>
          <h2 className="text-sm font-semibold text-[var(--danger)]">
            {lang === "mn" ? "Аюултай хэсэг" : "Danger zone"}
          </h2>
          <p className="text-xs text-muted mt-1">
            {lang === "mn"
              ? "Бүртгэлээ устгасны дараа сэргээх боломжгүй. Захиалга, түүх, мэдэгдэл бүгд алга болно."
              : "Once you delete your account, it cannot be recovered. All subscription, history, and notifications will be erased."}
          </p>
        </div>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="px-4 py-2.5 rounded-xl border border-[var(--danger)]/40 text-[var(--danger)] text-sm font-semibold
              hover:bg-[var(--danger)]/10 transition-colors">
            {t("delete_account")}
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/[0.04] space-y-3">
            <p className="text-xs text-app font-medium">
              {lang === "mn"
                ? <>Баталгаажуулахын тулд доорх талбарт <span className="font-mono font-bold text-[var(--danger)]">DELETE</span> гэж бичнэ үү.</>
                : <>To confirm, type <span className="font-mono font-bold text-[var(--danger)]">DELETE</span> in the field below.</>}
            </p>
            <input type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-lg bg-input border border-app text-app text-sm
                focus:outline-none focus:border-[var(--danger)] transition-colors" />

            {deleteError && (
              <p className="text-xs text-[var(--danger)]">{deleteError}</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setConfirmDelete(false); setDeleteText(""); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-app text-sm font-semibold text-sub hover:text-app transition-colors disabled:opacity-50">
                {lang === "mn" ? "Болих" : "Cancel"}
              </button>
              <button onClick={handleDelete}
                disabled={deleting || deleteText !== "DELETE"}
                className="flex-1 py-2.5 rounded-lg bg-[var(--danger)] text-white text-sm font-bold
                  hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting
                  ? (lang === "mn" ? "Устгаж байна..." : "Deleting...")
                  : (lang === "mn" ? "Бүртгэл устгах" : "Delete account")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────── */
function ToggleRow({
  label, storageKey, defaultOn,
}: { label: string; storageKey: string; defaultOn: boolean }) {
  const isOn = typeof window !== "undefined"
    ? (window.localStorage.getItem(storageKey) ?? (defaultOn ? "1" : "0")) === "1"
    : defaultOn;

  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card border border-app cursor-pointer hover:bg-card-hover transition-colors">
      <span className="text-sm font-medium text-app">{label}</span>
      <input type="checkbox"
        defaultChecked={isOn}
        onChange={(e) => window.localStorage.setItem(storageKey, e.target.checked ? "1" : "0")}
        className="peer sr-only" />
      <span className="relative w-10 h-6 rounded-full bg-input border border-app
        peer-checked:bg-accent peer-checked:border-accent transition-colors shrink-0
        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4
        after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}
