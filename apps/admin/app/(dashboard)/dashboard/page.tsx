"use client";

import { useEffect, useState } from "react";
import { Users, CircleDollarSign, Film, Tv, Package, UserX, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, DashboardStats } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { SparkChart } from "@/components/admin/SparkChart";
import { PlanBreakdownChart } from "@/components/admin/PlanBreakdownChart";
import { formatCurrency } from "@/lib/utils";

interface RevenueTrendItem {
  date: string;
  amount: number;
  count: number;
}

export default function DashboardPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<RevenueTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<DashboardStats>>("/api/admin/stats"),
      api.get<ApiResponse<RevenueTrendItem[]>>("/api/admin/stats/revenue-trend", { params: { days: 7 } }),
    ])
      .then(([s, t]) => {
        setStats(s.data.data);
        setTrend(t.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  /* 7 хоногийн нийт орлогын тренд */
  const trendTotal = trend.reduce((s, d) => s + d.amount, 0);
  const trendChange = trend.length >= 2
    ? trend[trend.length - 1].amount - trend[0].amount
    : 0;

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

          {/* Chart row — Revenue trend + Plan breakdown */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Revenue trend (2/3 width) */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" />
                    7 хоногийн орлогын тренд
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Нийт <strong className="text-fg">{formatCurrency(trendTotal)}</strong>
                    {trendChange !== 0 && (
                      <span className={`ml-2 ${trendChange > 0 ? "text-success" : "text-danger"}`}>
                        {trendChange > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(trendChange))}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {trend.length === 0 || trendTotal === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-muted">
                  Сүүлийн 7 хоногт орлого бүртгэгдээгүй
                </div>
              ) : (
                <>
                  <SparkChart data={trend} height={120} formatY={formatCurrency} />
                  <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] text-muted text-center">
                    {trend.map((d) => (
                      <span key={d.date}>
                        {new Date(d.date).toLocaleDateString("mn-MN", { weekday: "short" })}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Plan breakdown (1/3 width) */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-fg mb-4">Багцын хуваарилалт</h3>
              <PlanBreakdownChart data={stats.plans} />
            </div>
          </div>

          {/* Content + blocked */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Film}    label="VOD контент" value={stats.content.vod.toLocaleString("mn-MN")} />
            <StatCard icon={Tv}      label="Live суваг"  value={stats.content.channels.toLocaleString("mn-MN")} />
            <StatCard icon={Package} label="Видео багц"  value={stats.content.bundles.toLocaleString("mn-MN")} />
            <StatCard icon={UserX}   label="Блоктой хэрэглэгч" value={stats.users.blocked.toLocaleString("mn-MN")} tone="danger" />
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
