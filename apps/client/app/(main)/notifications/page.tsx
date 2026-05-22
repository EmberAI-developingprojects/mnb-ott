"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const TYPE_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  SUBSCRIPTION: { label: "Захиалга",  color: "bg-blue-500/15 text-blue-400",
    icon: <path d="M12 2v20M2 12h20"/> },
  PAYMENT:      { label: "Төлбөр",    color: "bg-emerald-500/15 text-emerald-400",
    icon: <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 1 0 0 4h4v-4z"/> },
  CONTENT:      { label: "Контент",   color: "bg-purple-500/15 text-purple-400",
    icon: <path d="M19 11H5a2 2 0 0 0-2 2v7h18v-7a2 2 0 0 0-2-2zM9 7v4M15 7v4M3 7l9-4 9 4"/> },
  PROMO:        { label: "Урамшуулал",color: "bg-orange-500/15 text-orange-400",
    icon: <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/> },
  SYSTEM:       { label: "Систем",    color: "bg-slate-500/15 text-slate-300",
    icon: <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/> },
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const { lang } = useSettingsStore();
  const t = useT();
  const [items, setItems]   = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login?callbackUrl=/notifications"); return; }
    api.get<{ success: true; data: { items: AppNotification[] } }>("/api/notifications")
      .then((r) => setItems(r.data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  async function markRead(id: string) {
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try { await api.patch(`/api/notifications/${id}/read`); }
    catch { /* silent */ }
  }

  async function markAll() {
    setMarking(true);
    setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
    try { await api.post("/api/notifications/mark-all-read"); }
    catch { /* silent */ }
    finally { setMarking(false); }
  }

  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function remove(id: string) {
    setItems((arr) => arr.filter((n) => n.id !== id));
    setConfirmDel(null);
    try { await api.delete(`/api/notifications/${id}`); }
    catch { /* silent */ }
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-12 space-y-5">
      {unread > 0 && (
        <div className="flex items-center justify-end">
          <button onClick={markAll} disabled={marking}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-card hover:bg-card-hover
              border border-app text-sub transition-colors disabled:opacity-50">
            {t("notif_mark_all")}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-card flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-sub font-medium">{t("notif_empty")}</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            const Wrapper = n.link ? Link : "div" as React.ElementType;
            return (
              <li key={n.id}
                className={cn(
                  "group relative flex gap-3 p-3.5 rounded-xl border transition-colors",
                  n.isRead
                    ? "border-app bg-card"
                    : "border-brand/40 bg-brand/[0.06]",
                )}>
                {/* Icon */}
                <div className={cn("w-9 h-9 shrink-0 rounded-full flex items-center justify-center", meta.color)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {meta.icon}
                  </svg>
                </div>

                {/* Body */}
                <Wrapper
                  {...(n.link ? { href: n.link, onClick: () => markRead(n.id) } : { onClick: () => markRead(n.id) })}
                  className="flex-1 min-w-0 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-semibold text-app">{n.title}</p>
                    {!n.isRead && (
                      <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-brand" />
                    )}
                  </div>
                  <p className="text-xs text-sub mt-1 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted mt-1.5 uppercase tracking-wider">
                    {new Date(n.createdAt).toLocaleString(lang === "mn" ? "mn-MN" : "en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </Wrapper>

                {/* Close — confirmation шаардана */}
                <button onClick={() => setConfirmDel(n.id)}
                  className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity
                    w-7 h-7 rounded-full hover:bg-card-hover flex items-center justify-center text-muted hover:text-[var(--danger)]"
                  title={lang === "mn" ? "Устгах" : "Delete"}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 overlay-bg backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmDel(null)}>
          <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-pop animate-scale-in"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-app">
              {lang === "mn" ? "Мэдэгдэл устгах уу?" : "Delete notification?"}
            </h2>
            <p className="text-sm text-sub">
              {lang === "mn" ? "Энэ мэдэгдлийг устгасны дараа сэргээх боломжгүй." : "This notification will be permanently deleted."}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl bg-card border border-app text-sm font-semibold text-app hover:bg-card-hover">
                {lang === "mn" ? "Болих" : "Cancel"}
              </button>
              <button onClick={() => remove(confirmDel)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--danger)] hover:opacity-90 text-white text-sm font-bold">
                {lang === "mn" ? "Устгах" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
