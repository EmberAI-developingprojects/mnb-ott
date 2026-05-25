"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatDuration, cn } from "@/lib/utils";
import type { Video } from "./types";

/* Wrap-around hero carousel — нэр + thumbnail цуг шилждэг.
   7 секунд тутамд автоматаар дараагийн slide руу шилжих + manual arrows. */
export function HeroCarousel({ hero, loading }: { hero: Video[]; loading: boolean }) {
  const t = useT();
  const { lang } = useSettingsStore();
  const { has, add, remove } = useWatchlistStore();
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (hero.length < 2) return;
    heroTimer.current = setInterval(() => setHeroIdx((i) => (i + 1) % hero.length), 7000);
    return () => clearInterval(heroTimer.current);
  }, [hero.length]);

  function goHero(dir: 1 | -1) {
    setHeroIdx((i) => (i + dir + hero.length) % hero.length);
    clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => setHeroIdx((x) => (x + 1) % hero.length), 7000);
  }

  const current = hero[heroIdx];

  return (
    <section className="max-w-[1440px] mx-auto pt-3 md:pt-6 overflow-hidden">
      <div className="relative max-w-[1240px] mx-auto aspect-[4/3] xs:aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] min-h-[200px] xs:min-h-[240px] sm:min-h-[300px] md:min-h-[360px] lg:min-h-[420px]">

        {hero.map((v, i) => {
          /* Wrap-around offset тооцоо — урт жагсаалтын сүүлчийн slide эхнийх рүү гүйх боломжтой. */
          let offset = i - heroIdx;
          if (offset > hero.length / 2)  offset -= hero.length;
          if (offset < -hero.length / 2) offset += hero.length;
          const isActive = offset === 0;
          const saved = has(v.youtubeId);

          return (
            <div key={v.youtubeId}
              className={cn(
                "absolute inset-0 rounded-2xl overflow-hidden transition-all duration-700 ease-out",
                isActive ? "opacity-100 z-10" : "opacity-90 z-0",
              )}
              style={{ transform: `translateX(${offset * 102}%) scale(${isActive ? 1 : 0.95})` }}>
              <Image src={`https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`}
                alt={v.title} fill sizes="100vw"
                className="object-cover" priority={isActive} />

              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="relative h-full flex flex-col justify-end p-3 xs:p-4 sm:p-6 md:p-10 lg:p-14">
                <div className="max-w-xl">
                  <div className="hidden xs:inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-sm mb-2 sm:mb-3 md:mb-5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                      {lang === "mn" ? "Онцлох" : "Featured"}
                    </span>
                  </div>

                  <h1 className="text-[15px] xs:text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-2 md:mb-4 line-clamp-2 sm:line-clamp-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                    {v.title}
                  </h1>

                  <div className="hidden sm:flex items-center gap-3 mb-4 md:mb-6 text-[13px] text-white/80">
                    <span>{new Date(v.publishedAt).getFullYear()}</span>
                    {v.duration > 0 && (
                      <>
                        <span className="text-white/30">·</span>
                        <span>{formatDuration(v.duration)}</span>
                      </>
                    )}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/40">МНБ</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Link href={`/vod/${v.youtubeId}`}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-2.5 rounded-full bg-grad-amber text-white text-[11px] xs:text-xs sm:text-sm font-bold hover:shadow-glow active:scale-95 transition-all">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="sm:w-3.5 sm:h-3.5"><path d="M8 5v14l11-7z"/></svg>
                      {t("watch")}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (saved) remove(v.youtubeId);
                        else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
                      }}
                      className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-3 xs:px-4 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 rounded-full backdrop-blur-md border text-[11px] xs:text-xs sm:text-sm font-semibold transition-all",
                        saved ? "bg-white/10 border-accent text-white" : "bg-white/10 border-white/25 text-white hover:bg-white/20",
                      )}>
                      {saved ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-3.5 sm:h-3.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-3.5 sm:h-3.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      )}
                      <span>
                        {saved ? (lang === "mn" ? "Хадгалсан" : "Saved") : (lang === "mn" ? "Хадгалах" : "Save")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {(loading || !current) && (
          <div className="absolute inset-0 rounded-2xl bg-card flex items-end p-6 md:p-10">
            <div className="space-y-3 max-w-xl">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 sm:h-14 w-72 max-w-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        )}

        {hero.length > 1 && (
          <>
            <button onClick={() => goHero(-1)} aria-label="prev"
              className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/50 backdrop-blur hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => goHero(1)} aria-label="next"
              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/50 backdrop-blur hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-40 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white/70 text-[11px] font-mono tabular-nums">
              <span className="text-white">{heroIdx + 1}</span>
              <span className="mx-1">/</span>
              <span>{hero.length}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
