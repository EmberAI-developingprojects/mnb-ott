"use client";

import { useEffect, useState } from "react";
import { Users, CircleDollarSign, Film, Tv, Package, UserX, TrendingUp, Radio } from "lucide-react";
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

/* Тоо/огноог tabular figures-ээр — багана/орлого зэрэгцэж эгнэнэ */
const NUM = "tabular-nums";

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
      <PageHeader
        title="Тойм"
        subtitle="Системийн ерөнхий мэдээлэл"
        action={stats ? <LiveBadge liveEvents={stats.content.live} /> : undefined}
      />

      {loading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Primary metrics */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}            label="Нийт хэрэглэгч"    value={stats.users.total.toLocaleString("mn-MN")} />
            <StatCard icon={CircleDollarSign} label="Өнөөдрийн орлого"  value={formatCurrency(stats.revenue.today)} hint={`${stats.revenue.todayCount} гүйлгээ`} />
            <StatCard icon={CircleDollarSign} label="Нийт орлого"       value={formatCurrency(stats.revenue.total)} />
            <StatCard icon={Users}            label="Идэвхтэй захиалга" value={stats.users.activeSubs.toLocaleString("mn-MN")} />
          </section>

          {/* Chart row — Revenue trend + Plan breakdown */}
          <section className="grid lg:grid-cols-3 gap-4">
            {/* Revenue trend (2/3) */}
            <div className="lg:col-span-2 rounded-lg bg-surface border border-border shadow-card p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <TrendingUp size={14} className="text-primary" aria-hidden="true" />
                    7 хоногийн орлогын тренд
                  </h2>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className={`${NUM} text-xl font-semibold text-fg`}>{formatCurrency(trendTotal)}</span>
                    {trendChange !== 0 && (
                      <span className={`${NUM} text-xs font-medium ${trendChange > 0 ? "text-success" : "text-danger"}`}>
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
                  <div className={`mt-3 grid grid-cols-7 gap-1 text-[11px] text-muted-strong text-center ${NUM}`}>
                    {trend.map((d) => (
                      <span key={d.date}>
                        {new Date(d.date).toLocaleDateString("mn-MN", { weekday: "short" })}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Plan breakdown (1/3) */}
            <div className="rounded-lg bg-surface border border-border shadow-card p-5">
              <h2 className="text-sm font-semibold text-fg mb-4">Багцын хуваарилалт</h2>
              <PlanBreakdownChart data={stats.plans} />
            </div>
          </section>

          {/* Content + blocked */}
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Film}    label="VOD контент"  value={stats.content.vod.toLocaleString("mn-MN")} />
            <StatCard icon={Package} label="Видео багц"   value={stats.content.bundles.toLocaleString("mn-MN")} />
            <StatCard icon={UserX}   label="Блоктой хэрэглэгч" value={stats.users.blocked.toLocaleString("mn-MN")} tone="danger" />
          </section>

          {/* Channel breakdown — TV/Radio/LIVE event тус тусдаа */}
          <section className="grid grid-cols-3 gap-4">
            <StatCard icon={Tv}    label="TV суваг"     value={stats.content.tv.toLocaleString("mn-MN")} />
            <StatCard icon={Radio} label="Радио"        value={stats.content.radio.toLocaleString("mn-MN")} />
            <StatCard icon={Radio} label="LIVE event"   value={stats.content.live.toLocaleString("mn-MN")} hint="PPV event" />
          </section>
        </div>
      )}
    </div>
  );
}

/* ── LIVE event badge — зөвхөн kind=LIVE (PPV event) сувгийн тоо ── */
function LiveBadge({ liveEvents }: { liveEvents: number }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 py-1.5">
      <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
      <Radio size={13} className="text-success" aria-hidden="true" />
      <span className="text-xs font-medium text-fg">LIVE event</span>
      <span className="h-3 w-px bg-border-strong" aria-hidden="true" />
      <span className={`${NUM} text-xs text-muted`}>{liveEvents}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";
  /* StatCard нь зөвхөн дэлгэц — click биш. Hover state хийхгүй — дарагдах гэж хүн андуурахаас сэргийлнэ. */
  return (
    <div className="rounded-lg bg-surface border border-border shadow-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md
                          ${danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
          <Icon size={14} aria-hidden="true" />
        </span>
      </div>
      <p className={`${NUM} mt-3 text-2xl font-bold ${danger ? "text-danger" : "text-fg"}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-strong">{hint}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-lg bg-surface border border-border shadow-card animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-56 rounded-lg bg-surface border border-border shadow-card animate-pulse" />
        <div className="h-56 rounded-lg bg-surface border border-border shadow-card animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-lg bg-surface border border-border shadow-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
