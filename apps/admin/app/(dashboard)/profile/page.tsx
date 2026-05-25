"use client";

import { Moon, Sun, Check } from "lucide-react";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, type Theme } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

/* Профайл — дансны мэдээлэл (одоогоор зөвхөн харах) + дэлгэцийн горим.
   Цаашид нэр/нууц үг солих зэрэг өөрчлөх боломжуудыг энд нэмнэ. */

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark",  label: "Бараан", icon: Moon },
  { value: "light", label: "Цайвар", icon: Sun },
];

export default function ProfilePage() {
  useRoleGuard(["EDITOR", "OPERATOR", "ADMIN", "SUPER_ADMIN"]);
  const { user } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Профайл"
        subtitle="Дансны мэдээлэл болон дэлгэцийн тохиргоо"
      />

      <div className="max-w-2xl space-y-8">
        {/* Дансны мэдээлэл — одоогоор зөвхөн харах */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-fg">Дансны мэдээлэл</h2>
          <div className="rounded-lg border border-border bg-surface shadow-card divide-y divide-border">
            <Row label="Нэр">{user.name ?? "—"}</Row>
            <Row label="И-мэйл">{user.email ?? "—"}</Row>
            <Row label="Утас">{user.phone ?? "—"}</Row>
            <Row label="Роль"><Badge tone="primary">{user.role}</Badge></Row>
          </div>
        </section>

        {/* Дэлгэцийн горим */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-fg">Дэлгэцийн горим</h2>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={active}
                  className={cn(
                    "relative overflow-hidden rounded-lg border p-3 text-left transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:bg-bg",
                  )}
                >
                  {/* Mini preview — энэ нь идэвхтэй theme-ээс үл хамааран 2 горимыг төлөөлнө */}
                  <div
                    className={cn(
                      "mb-3 flex h-16 items-center gap-1.5 rounded-md border px-2.5",
                      value === "dark" ? "border-white/10 bg-[#0b0f17]" : "border-black/10 bg-[#eef1f6]",
                    )}
                  >
                    <span className={cn("h-7 w-1.5 rounded-full", value === "dark" ? "bg-[#3b82f6]" : "bg-[#0046A5]")} />
                    <div className="flex-1 space-y-1.5">
                      <span className={cn("block h-1.5 w-3/4 rounded-full", value === "dark" ? "bg-white/30" : "bg-black/25")} />
                      <span className={cn("block h-1.5 w-1/2 rounded-full", value === "dark" ? "bg-white/15" : "bg-black/15")} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Icon size={15} className={active ? "text-primary" : "text-muted"} aria-hidden="true" />
                    <span className="text-sm font-semibold text-fg">{label}</span>
                  </div>

                  {active && (
                    <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check size={12} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-fg">{children}</span>
    </div>
  );
}
