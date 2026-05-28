"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/store/settingsStore";
import type { EpgProgram } from "./types";

/* Өнөөдрийн хөтөлбөр — horizontal scroll card (Korean OTT маяг).
   Past үе нь dimmed, current нь accent border + progress bar, future нь clock icon. */
export function TodaySchedule({ programs, lang }: { programs: EpgProgram[]; lang: "mn" | "en" }) {
  const t = useT();
  /* lang нь зөвхөн toLocaleTimeString locale-д хэрэгтэй — UI string-ууд dict-руу */
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (d: "l" | "r") => scrollRef.current?.scrollBy({ left: d === "r" ? 360 : -360, behavior: "smooth" });

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const today = programs.filter((p) => {
    const s = new Date(p.startTime);
    return s >= todayStart && s <= todayEnd;
  });

  if (today.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted bg-card rounded-xl border border-app">
        {t("today_schedule_empty")}
      </p>
    );
  }

  return (
    <div className="relative group/sched">
      <button onClick={() => scroll("l")} aria-label="prev"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app shadow-card items-center justify-center hidden group-hover/sched:flex hover:bg-card-hover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button onClick={() => scroll("r")} aria-label="next"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app shadow-card items-center justify-center hidden group-hover/sched:flex hover:bg-card-hover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {today.map((p) => {
          const start = new Date(p.startTime);
          const end   = new Date(p.endTime);
          const isCurrent = start <= now && end > now;
          const isPast    = end <= now;
          const isFuture  = start > now;
          const fmt = (d: Date) => d.toLocaleTimeString(lang === "mn" ? "mn-MN" : "en-US",
            { hour: "2-digit", minute: "2-digit" });

          const progress = isCurrent
            ? Math.min(100, Math.max(0, ((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
            : 0;

          return (
            <div key={p.id}
              className={cn(
                "shrink-0 w-[260px] sm:w-[280px] relative bg-card border rounded-xl p-3.5 flex flex-col gap-2 transition-all",
                isCurrent ? "border-accent" : "border-app hover:border-strong",
                isPast    && "opacity-50",
              )}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] leading-snug line-clamp-2 flex-1 font-medium text-app">
                  {p.title}
                </p>
                {isPast && (
                  <button className="shrink-0 px-2.5 py-1 rounded-full border border-app text-[10.5px] font-semibold text-sub hover:text-app">
                    {t("replay")}
                  </button>
                )}
                {isCurrent && (
                  <button className="shrink-0 px-2.5 py-1 rounded-full bg-accent text-white text-[10.5px] font-bold">
                    {t("watch_live")}
                  </button>
                )}
                {isFuture && (
                  <span className="shrink-0 w-7 h-7 rounded-full border border-app flex items-center justify-center text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                )}
              </div>

              <p className={cn("text-[12px] font-mono tabular-nums mt-auto",
                isCurrent ? "text-accent font-bold" : "text-muted")}>
                {fmt(start)} <span className="opacity-60">–</span> {fmt(end)}
              </p>

              {isCurrent && (
                <div className="absolute left-3 right-3 -bottom-px h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
