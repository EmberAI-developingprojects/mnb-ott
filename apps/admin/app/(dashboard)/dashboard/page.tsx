"use client";

import { useEffect, useState } from "react";
import { Users, CircleDollarSign, Film, Tv, Package, UserX } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, DashboardStats } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<DashboardStats>>("/api/admin/stats")
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Тойм" subtitle="Системийн ерөнхий мэдээлэл" />

      {loading || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}            label="Нийт хэрэглэгч"      value={stats.users.total.toLocaleString("mn-MN")} />
            <StatCard icon={CircleDollarSign} label="Өнөөдрийн орлого"    value={formatCurrency(stats.revenue.today)} hint={`${stats.revenue.todayCount} гүйлгээ`} />
            <StatCard icon={CircleDollarSign} label="Нийт орлого"         value={formatCurrency(stats.revenue.total)} />
            <StatCard icon={Users}            label="Идэвхтэй захиалга"   value={stats.users.activeSubs.toLocaleString("mn-MN")} />
          </div>

          {/* Content + blocked */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Film}    label="VOD контент" value={stats.content.vod.toLocaleString("mn-MN")} />
            <StatCard icon={Tv}      label="Live суваг"  value={stats.content.channels.toLocaleString("mn-MN")} />
            <StatCard icon={Package} label="Видео багц"  value={stats.content.bundles.toLocaleString("mn-MN")} />
            <StatCard icon={UserX}   label="Блоктой хэрэглэгч" value={stats.users.blocked.toLocaleString("mn-MN")} tone="danger" />
          </div>

          {/* Plan breakdown */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-fg mb-4">Багцын хуваарилалт</h3>
            {stats.plans.length === 0 ? (
              <p className="text-sm text-muted">Идэвхтэй захиалга байхгүй</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.plans.map((p) => (
                  <div key={p.plan} className="border border-border rounded-md p-4">
                    <p className="text-xs text-muted uppercase tracking-wider">{p.plan}</p>
                    <p className="text-2xl font-bold text-fg mt-1.5">{p.count.toLocaleString("mn-MN")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone }: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        <Icon size={16} className={tone === "danger" ? "text-danger" : "text-muted"} />
      </div>
      <p className={`text-2xl font-bold mt-2 ${tone === "danger" ? "text-danger" : "text-fg"}`}>{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
