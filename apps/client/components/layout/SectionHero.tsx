"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface HeroItem {
  href:        string;
  title:       string;
  thumbnailId: string;
  badge?:      string;
}

interface Props {
  items:    HeroItem[];
  loading?: boolean;
  eyebrow:  string;
}

/* Inner page hero — contained card with strong left gradient */
export function SectionHero({ items, loading, eyebrow }: Props) {
  const { lang } = useSettingsStore();
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (items.length < 2) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(timer.current);
  }, [items.length]);

  function go(dir: 1 | -1) {
    setIdx((i) => (i + dir + items.length) % items.length);
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((x) => (x + 1) % items.length), 7000);
  }

  const current = items[idx];

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)]">
      <div className="relative aspect-[21/9] min-h-[380px] rounded-2xl overflow-hidden bg-surface">
        {items.map((it, i) => (
          <div key={it.thumbnailId}
            className={cn("absolute inset-0 transition-opacity duration-700",
              i === idx ? "opacity-100" : "opacity-0")}>
            <img src={`https://i.ytimg.com/vi/${it.thumbnailId}/maxresdefault.jpg`}
              alt={it.title} className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-end p-6 md:p-10 lg:p-14">
          {loading || !current ? (
            <div className="space-y-3 max-w-xl">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-96 max-w-full" />
            </div>
          ) : (
            <div className="max-w-xl space-y-4 animate-fade-in" key={current.thumbnailId}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/15 backdrop-blur-sm">
                <span className="text-[10px] font-bold tracking-wider uppercase text-white">{eyebrow}</span>
                {current.badge && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{current.badge}</span>
                  </>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] line-clamp-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                {current.title}
              </h1>

              <Link href={current.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-grad-amber text-white text-sm font-bold hover:shadow-glow active:scale-95 transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {lang === "mn" ? "Үзэх" : "Watch"}
              </Link>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="prev"
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur hover:bg-black/70 text-white items-center justify-center transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => go(1)} aria-label="next"
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur hover:bg-black/70 text-white items-center justify-center transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-white/60 text-xs font-mono tabular-nums">
              <span className="text-white">{idx + 1}</span>
              <span className="mx-1">|</span>
              <span>{items.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
