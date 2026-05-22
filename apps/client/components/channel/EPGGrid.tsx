"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
}

interface EpgChannel {
  id: string;
  name: string;
  slug: string;
  programs: Program[];
}

interface EPGGridProps {
  channels: EpgChannel[];
  onChannelSelect?: (slug: string) => void;
  activeChannelSlug?: string;
}

const CELL_WIDTH = 160; // px / цаг
const CHAN_WIDTH = 88;  // px — суваг нэрийн багана

function timeToX(time: Date, origin: Date): number {
  return ((time.getTime() - origin.getTime()) / (1000 * 60 * 60)) * CELL_WIDTH;
}

function durationToW(start: Date, end: Date): number {
  return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * CELL_WIDTH;
}

const CATEGORY_COLORS: Record<string, string> = {
  Мэдээ:       "bg-blue-900/60 border-blue-600/40",
  Нэвтрүүлэг: "bg-violet-900/60 border-violet-600/40",
  Хүүхэд:     "bg-amber-900/60 border-amber-500/40",
  Спорт:       "bg-emerald-900/60 border-emerald-600/40",
  Баримтат:    "bg-orange-900/60 border-orange-500/40",
  Кино:        "bg-rose-900/60 border-rose-600/40",
};
const DEFAULT_COLOR = "bg-surface border-app";

export function EPGGrid({ channels, onChannelSelect, activeChannelSlug }: EPGGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = өнөөдөр

  const now = new Date();

  // Сонгосон өдрийн 06:00 — grid-ийн эхлэл
  const origin = new Date(now);
  origin.setDate(origin.getDate() + selectedDay);
  origin.setHours(6, 0, 0, 0);

  // 24 цагийн grid (06:00–06:00)
  const totalHours = 24;
  const gridWidth = totalHours * CELL_WIDTH;

  // Одоогийн цагийн шугамын байрлал
  const nowX = selectedDay === 0 ? Math.max(0, timeToX(now, origin)) : -1;

  // Өнөөдөр харагдах байрлалруу scroll
  useEffect(() => {
    if (selectedDay === 0 && scrollRef.current) {
      const target = Math.max(0, nowX - 120);
      scrollRef.current.scrollLeft = target;
    } else if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [selectedDay, nowX]);

  // Өдрийн navigaton
  const days = Array.from({ length: 9 }, (_, i) => i - 3); // -3..+5
  function dayLabel(offset: number): string {
    if (offset === 0) return "Өнөөдөр";
    if (offset === -1) return "Өчигдөр";
    if (offset === 1) return "Маргааш";
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("mn-MN", { month: "short", day: "numeric" });
  }

  // Суваг бүрийн сонгосон өдрийн программуудыг шүүнэ
  function dayPrograms(ch: EpgChannel): Program[] {
    const dayStart = origin.getTime();
    const dayEnd = dayStart + totalHours * 3600 * 1000;
    return ch.programs.filter((p) => {
      const s = new Date(p.startTime).getTime();
      const e = new Date(p.endTime).getTime();
      return e > dayStart && s < dayEnd;
    });
  }

  return (
    <div className="bg-surface rounded-xl overflow-hidden border border-app">

      {/* Өдрийн сонголт */}
      <div className="flex gap-1 p-3 border-b border-app overflow-x-auto scrollbar-hide">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              selectedDay === d
                ? "bg-primary text-white"
                : d < 0
                  ? "text-muted hover:text-app hover:bg-[var(--border)]"
                  : "text-app hover:bg-[var(--border)]"
            )}
          >
            {dayLabel(d)}
          </button>
        ))}
      </div>

      <div className="flex overflow-hidden">
        {/* Суваг нэрийн багана */}
        <div className="shrink-0 border-r border-app" style={{ width: CHAN_WIDTH }}>
          {/* Цагийн header-тэй нийцэх хоосон зай */}
          <div className="h-8 border-b border-app" />
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onChannelSelect?.(ch.slug)}
              className={cn(
                "w-full h-14 flex items-center justify-center text-xs font-bold border-b border-app transition-colors",
                activeChannelSlug === ch.slug
                  ? "text-primary bg-primary/10"
                  : "text-muted hover:text-app hover:bg-[var(--border)]"
              )}
            >
              {ch.name}
            </button>
          ))}
        </div>

        {/* Scroll хэсэг */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide relative">
          <div style={{ width: gridWidth, minWidth: gridWidth }}>

            {/* Цагийн header */}
            <div className="h-8 border-b border-app flex sticky top-0 bg-surface z-10">
              {Array.from({ length: totalHours }, (_, i) => {
                const h = (origin.getHours() + i) % 24;
                return (
                  <div
                    key={i}
                    className="shrink-0 flex items-center pl-2 text-xs text-muted"
                    style={{ width: CELL_WIDTH }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                );
              })}
            </div>

            {/* Суваг мөрүүд */}
            {channels.map((ch) => {
              const progs = dayPrograms(ch);
              return (
                <div
                  key={ch.id}
                  className="relative h-14 border-b border-app"
                  style={{ width: gridWidth }}
                >
                  {/* Програмууд — өнгөгүй, цэвэр */}
                  {progs.map((p) => {
                    const pStart = new Date(p.startTime);
                    const pEnd = new Date(p.endTime);
                    const x = Math.max(0, timeToX(pStart, origin));
                    const w = Math.max(2, durationToW(pStart, pEnd) - 2);
                    const isNow = selectedDay === 0 && now >= pStart && now < pEnd;
                    const isPast = selectedDay === 0 && pEnd <= now;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "absolute top-1 bottom-1 rounded overflow-hidden px-2 py-1 flex flex-col justify-center border",
                          isNow
                            ? "bg-accent-soft border-accent/40"
                            : "bg-card border-app hover:bg-card-hover hover:border-strong",
                          isPast && "opacity-35"
                        )}
                        style={{ left: x + 1, width: w }}
                        title={`${p.title} — ${pStart.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}–${pEnd.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}`}
                      >
                        {/* Цаг */}
                        <div className="flex items-center gap-1 text-[10px] tabular-nums font-mono">
                          {isNow && <span className="w-1 h-1 rounded-full bg-[var(--danger)] animate-pulse shrink-0" />}
                          <span className={cn(isNow ? "text-accent font-bold" : "text-muted")}>
                            {pStart.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                            <span className="mx-0.5">–</span>
                            {pEnd.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {/* Title */}
                        <span className={cn("text-[11px] truncate mt-0.5", isNow ? "text-app font-semibold" : "text-sub")}>
                          {p.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Одоогийн цагийн босоо шугам */}
            {selectedDay === 0 && nowX >= 0 && nowX <= gridWidth && (
              <div
                className="absolute top-0 bottom-0 w-px bg-danger z-20 pointer-events-none"
                style={{ left: nowX }}
                ref={nowRef}
              >
                <div className="w-2 h-2 rounded-full bg-danger -translate-x-[3px] -translate-y-px" />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
