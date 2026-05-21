"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface ConfigItem {
  key: string;
  value: string;
  label: string;
}

const GROUPS: { title: string; prefix: string }[] = [
  { title: "Subscription үнэ (₮)", prefix: "plan." },
  { title: "DVR & TVOD тохиргоо", prefix: "dvr." },
  { title: "TVOD тохиргоо", prefix: "tvod." },
  { title: "Trial хугацаа", prefix: "trial." },
];

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [configs, setConfigs] = useState<Record<string, ConfigItem>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.push("/");
      return;
    }
    api.get<{ success: true; data: { configs: Record<string, { value: string; label: string }> } }>(
      "/api/admin/config"
    ).then((r) => {
      const result: Record<string, ConfigItem> = {};
      for (const [k, v] of Object.entries(r.data.data.configs)) {
        result[k] = { key: k, ...v };
      }
      setConfigs(result);
    }).finally(() => setLoading(false));
  }, [user, router]);

  async function handleSave(key: string) {
    const val = editing[key];
    if (val === undefined) return;
    setSaving(key);
    try {
      await api.patch(`/api/admin/config/${key}`, { value: val });
      setConfigs((prev) => ({ ...prev, [key]: { ...prev[key], value: val } }));
      setEditing((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  function getGroupItems(prefix: string) {
    return Object.values(configs).filter((c) => c.key.startsWith(prefix));
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-app">Системийн тохиргоо</h1>
        <p className="text-sm text-muted mt-1">Subscription үнэ болон бусад тохиргоог admin UI-аас өөрчилнө</p>
      </div>

      {GROUPS.map(({ title, prefix }) => {
        const items = getGroupItems(prefix);
        if (items.length === 0) return null;
        return (
          <section key={prefix} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">{title}</h2>
            <div className="surface-base rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
              {items.map((cfg) => {
                const currentVal = editing[cfg.key] ?? cfg.value;
                const isEdited = editing[cfg.key] !== undefined;
                const isSaving = saving === cfg.key;
                const isSaved = saved === cfg.key;

                return (
                  <div key={cfg.key} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-app">{cfg.label}</p>
                      <p className="text-xs text-muted mt-0.5 font-mono">{cfg.key}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                        className="w-24 text-right px-3 py-1.5 rounded-lg border input-base
                          text-sm focus:ring-2 focus:ring-[#0046A5]/15 transition-colors"
                      />
                      {isEdited && (
                        <button
                          onClick={() => handleSave(cfg.key)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-[#0046A5] text-white text-xs font-semibold rounded-lg
                            hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? "..." : "Хадгалах"}
                        </button>
                      )}
                      {isSaved && !isEdited && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Хадгалсан
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-muted text-center">
        Тохиргоо 5 минутын дараа автоматаар хэрэгжинэ (Redis cache)
      </p>
    </div>
  );
}
