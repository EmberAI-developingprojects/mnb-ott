"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api from "@/lib/api";

interface Session {
  id:          string;
  deviceName:  string;
  deviceType:  string;
  lastActive:  string;
  createdAt:   string;
}

/* "yyyy.MM.dd HH:mm:ss" формат — table-д тогтмол өргөнтэй цаг харагдана */
function fmtDateTime(d: string): string {
  const dt = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())} `
       + `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/* deviceType-аас app нэр гаргана — "web" → "MNB Web", "ios" → "MNB iOS" гм. */
function appName(deviceType: string): string {
  switch (deviceType) {
    case "ios":     return "MNB iOS";
    case "android": return "MNB Android";
    case "tv":      return "MNB TV";
    case "web":
    default:        return "MNB Web";
  }
}

export default function DevicesPage() {
  const { user } = useAuthStore();
  const { lang } = useSettingsStore();
  const t = useT();
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [removing,  setRemoving]  = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ success: true; data: Session[] }>("/api/auth/sessions")
      .then((r) => setSessions(r.data.data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await api.delete(`/api/auth/sessions/${id}`);
      setSessions((p) => p.filter((s) => s.id !== id));
    } finally { setRemoving(null); }
  }

  const labels = lang === "mn"
    ? { device: "Төхөөрөмжийн загвар", app: "Апликейшн", connected: "Холбогдсон өдөр", lastActive: "Сүүлд холбогдсон өдөр", action: "" }
    : { device: "Device",              app: "App",       connected: "Connected on",  lastActive: "Last active",          action: "" };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-app">{t("device_title")}</h1>
        <p className="text-muted text-sm mt-1">{t("device_sub")}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-app rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-muted text-sm">{t("no_devices")}</p>
      ) : (
        <>
          {/* Desktop/tablet — table layout (md+). Mobile-д table нь хэвтээ scroll
             хийгдэхгүй, дор card layout-аар нөгөө хэлбэрээр харуулна. */}
          <div className="hidden md:block surface-base rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card text-muted text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">{labels.device}</th>
                  <th className="text-left px-5 py-3">{labels.app}</th>
                  <th className="text-left px-5 py-3 font-mono normal-case tracking-normal">{labels.connected}</th>
                  <th className="text-left px-5 py-3 font-mono normal-case tracking-normal">{labels.lastActive}</th>
                  <th className="text-right px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-card-hover transition-colors">
                    <td className="px-5 py-4 text-app font-medium">{s.deviceName}</td>
                    <td className="px-5 py-4 text-sub">{appName(s.deviceType)}</td>
                    <td className="px-5 py-4 text-muted font-mono tabular-nums text-xs">{fmtDateTime(s.createdAt)}</td>
                    <td className="px-5 py-4 text-muted font-mono tabular-nums text-xs">{fmtDateTime(s.lastActive)}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleRemove(s.id)} disabled={removing === s.id}
                        className="text-xs text-muted hover:text-[var(--danger)] transition-colors disabled:opacity-40">
                        {removing === s.id ? "..." : t("device_signout")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — stacked cards (table нь зайнд багтахгүй) */}
          <div className="md:hidden surface-base rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
            {sessions.map((s) => (
              <div key={s.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-app text-sm font-semibold truncate">{s.deviceName}</p>
                    <p className="text-sub text-xs">{appName(s.deviceType)}</p>
                  </div>
                  <button onClick={() => handleRemove(s.id)} disabled={removing === s.id}
                    className="text-xs text-muted hover:text-[var(--danger)] transition-colors disabled:opacity-40 shrink-0">
                    {removing === s.id ? "..." : t("device_signout")}
                  </button>
                </div>
                <div className="space-y-0.5 pt-1">
                  <p className="text-muted text-[11px]">
                    <span className="text-app/60">{labels.connected}: </span>
                    <span className="font-mono tabular-nums">{fmtDateTime(s.createdAt)}</span>
                  </p>
                  <p className="text-muted text-[11px]">
                    <span className="text-app/60">{labels.lastActive}: </span>
                    <span className="font-mono tabular-nums">{fmtDateTime(s.lastActive)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
