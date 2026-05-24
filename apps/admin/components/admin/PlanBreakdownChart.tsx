"use client";

import { useMemo } from "react";
import type { PlanType } from "@/types";

/* Plan distribution horizontal bar chart — простой, читаемый.
   Donut chart-аас илүү ойлгомжтой 4 plan-д. */

const PLAN_COLORS: Record<PlanType, string> = {
  BASIC: "bg-muted",       /* саарал */
  TV:    "bg-success",     /* ногоон */
  VOD:   "bg-warning",     /* шар */
  COMBO: "bg-primary",     /* цэнхэр */
};

const PLAN_LABEL: Record<PlanType, string> = {
  BASIC: "Энгийн",
  TV:    "ТВ",
  VOD:   "Видео сан",
  COMBO: "Бүгд",
};

interface Props {
  data: Array<{ plan: PlanType; count: number }>;
}

export function PlanBreakdownChart({ data }: Props) {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
  if (total === 0) {
    return <p className="text-sm text-muted">Идэвхтэй захиалга байхгүй</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (d.count / total) * 100;
        return (
          <div key={d.plan}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-fg font-medium">{PLAN_LABEL[d.plan]}</span>
              <span className="text-muted tabular-nums">
                {d.count.toLocaleString("mn-MN")}
                <span className="text-muted-strong ml-1.5">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${PLAN_COLORS[d.plan]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
