"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api from "@/lib/api";

interface Session { id: string; deviceName: string; deviceType: string; lastActive: string; }

export default function DevicesPage() {
  const { user } = useAuthStore();
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

  return (
    <div className="space-y-5 max-w-md">
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
        <div className="surface-base rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
          {sessions.map((s) => {
            const time = new Date(s.lastActive).toLocaleDateString("mn-MN", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            const isWeb = s.deviceType === "web" || !s.deviceType;
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {isWeb
                      ? <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>
                      : <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-app text-sm font-medium truncate">{s.deviceName}</p>
                  <p className="text-muted text-xs mt-0.5">{time}</p>
                </div>
                <button onClick={() => handleRemove(s.id)} disabled={removing === s.id}
                  className="text-xs text-muted hover:text-[#DA2031] transition-colors disabled:opacity-40">
                  {removing === s.id ? "..." : t("device_signout")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
