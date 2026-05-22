"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScrollRow } from "@/components/layout/ScrollRow";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatDuration, cn } from "@/lib/utils";
import api from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   HOME — Wavve-inspired layout
   ─────────────────────────────────────────────────────────────
   1. SOLID HEADER (separate)
   2. CONTAINED HERO CARD — rounded, max-width, side peeks
   3. CHANNEL STRIP — clear separation, pill shapes
   4. CONTENT ROWS — bundles, library (poster), archive (landscape)
   ═══════════════════════════════════════════════════════════════ */

const CHANNELS: { slug: string; label: string; isRadio?: boolean }[] = [
  { slug: "mnb1",         label: "main"    },
  { slug: "mnb-news",     label: "NEWS"    },
  { slug: "mnb-sport",    label: "SPORT"   },
  { slug: "mnb-family",   label: "FAMILY"  },
  { slug: "mnb-world",    label: "WORLD"   },
  { slug: "mnb-radio",    label: "RADIO",   isRadio: true },
  { slug: "bluesky-radio",label: "BLUESKY", isRadio: true },
];

interface Video {
  youtubeId: string; title: string; thumbnailUrl: string;
  duration: number; description?: string; publishedAt: string;
}
interface Bundle {
  id: string; title: string; thumbnailUrl: string;
  category?: { id: string; label: string }; items: Video[];
}

export default function HomePage() {
  const t = useT();
  const { lang } = useSettingsStore();
  const { has, add, remove } = useWatchlistStore();

  const [archive,  setArchive] = useState<Video[]>([]);
  const [library,  setLibrary] = useState<Video[]>([]);
  const [bundles,  setBundles] = useState<Bundle[]>([]);
  const [hero,     setHero]    = useState<Video[]>([]);
  const [loading,  setLoading] = useState(true);
  const [heroIdx,  setHeroIdx] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    Promise.all([
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/archive", { params: { limit: 8 } }),
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/library", { params: { limit: 8 } }),
      api.get<{ success: true; data: { bundles: Bundle[] } }>("/api/vod/bundles"),
    ]).then(([a, l, b]) => {
      setArchive(a.data.data.videos);
      setLibrary(l.data.data.videos);
      setBundles(b.data.data.bundles);
      setHero([...l.data.data.videos.slice(0, 3), ...a.data.data.videos.slice(0, 2)]);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hero.length < 2) return;
    heroTimer.current = setInterval(() => setHeroIdx((i) => (i + 1) % hero.length), 7000);
    return () => clearInterval(heroTimer.current);
  }, [hero.length]);

  function goHero(dir: 1 | -1 | number) {
    if (typeof dir === "number" && dir !== 1 && dir !== -1) {
      setHeroIdx(dir);
    } else {
      setHeroIdx((i) => (i + (dir as number) + hero.length) % hero.length);
    }
    clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => setHeroIdx((x) => (x + 1) % hero.length), 7000);
  }

  const current = hero[heroIdx];

  return (
    <div className="pt-[var(--header-h)]">
      {/* ═══════════════════════════════════════════════════════
          1. HERO — wrap-around carousel, content slides WITH banner
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-[1440px] mx-auto pt-4 md:pt-6 overflow-hidden">
        <div className="relative max-w-[1240px] mx-auto aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] min-h-[260px] md:min-h-[360px] lg:min-h-[420px]">

          {/* Slides — image + content нэг блок болж шилждэг */}
          {hero.map((v, i) => {
            /* Wrap-around offset: эхэндээ байгаа slide-аас N урагш зөв тооцоолж эсрэг тал руу зөөнө */
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
                {/* Image */}
                <img src={`https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`}
                  alt={v.title} className="absolute inset-0 w-full h-full object-cover" />

                {/* Gradient — текст уншихад */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Content — slide-тайгаа шилждэг */}
                <div className="relative h-full flex flex-col justify-end p-4 sm:p-6 md:p-10 lg:p-14">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-sm mb-3 md:mb-5">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                        {lang === "mn" ? "Онцлох" : "Featured"}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-2 md:mb-4 line-clamp-2 sm:line-clamp-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
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

                    <div className="flex items-center gap-2">
                      <Link href={`/vod/${v.youtubeId}`}
                        className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-grad-amber text-white text-xs sm:text-sm font-bold hover:shadow-glow active:scale-95 transition-all">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="sm:w-3.5 sm:h-3.5"><path d="M8 5v14l11-7z"/></svg>
                        {t("watch")}
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (saved) remove(v.youtubeId);
                          else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full backdrop-blur-md border text-xs sm:text-sm font-semibold transition-all",
                          saved ? "bg-accent border-accent text-white" : "bg-white/10 border-white/25 text-white hover:bg-white/20",
                        )}>
                        {saved ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-3.5 sm:h-3.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-3.5 sm:h-3.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                        {saved ? (lang === "mn" ? "Хадгалсан" : "Saved") : (lang === "mn" ? "Хадгалах" : "Save")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading skeleton */}
          {(loading || !current) && (
            <div className="absolute inset-0 rounded-2xl bg-card flex items-end p-6 md:p-10">
              <div className="space-y-3 max-w-xl">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 sm:h-14 w-72 max-w-full" />
                <Skeleton className="h-9 w-32 rounded-full" />
              </div>
            </div>
          )}

          {/* Arrows + counter */}
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

      {/* ═══════════════════════════════════════════════════════
          2. CHANNEL STRIP — голд байрлуулсан + scroll arrows
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-8">
        <ScrollRow center step={320}>
          {CHANNELS.map((ch) => (
            <Link key={ch.slug} href={`/tv?ch=${ch.slug}`}
              className="group relative shrink-0 w-[140px] sm:w-[160px] aspect-[16/9] rounded-xl
                bg-card border border-app flex flex-col items-center justify-center
                ring-1 ring-transparent hover:ring-2 hover:ring-accent ring-inset transition-all duration-200">
              <span className="text-app text-[22px] sm:text-[24px] font-black tracking-tight leading-none">
                MNB
              </span>
              <span className="text-accent text-[13px] font-semibold mt-1.5 uppercase tracking-wider">
                {ch.label}
              </span>
              {!ch.isRadio && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft" />
              )}
              {ch.isRadio && (
                <svg className="absolute top-2.5 right-2.5 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.24 6.15A2.99 2.99 0 0 0 2 8.66V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
              )}
            </Link>
          ))}
        </ScrollRow>
      </div>

      {/* ═══════════════════════════════════════════════════════
          3. CONTENT ROWS
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-10 space-y-12">

        <Section title={lang === "mn" ? "Видео багц" : "Bundles"} href="/bundles" t={t}>
          {loading ? <RowSkeleton wide /> :
            bundles.length === 0 ? null : (
              <HorizontalRow>
                {bundles.map((b) => <BundleCard key={b.id} bundle={b} />)}
              </HorizontalRow>
            )}
        </Section>

        <Section title={lang === "mn" ? "Видео сан" : "Library"} href="/library" t={t}>
          {loading ? <RowSkeleton poster /> : (
            <HorizontalRow>
              {library.map((v) => <PosterCard key={v.youtubeId} v={v} />)}
            </HorizontalRow>
          )}
        </Section>

        <Section title={lang === "mn" ? "Архив" : "Archive"} href="/archive" t={t}>
          {loading ? <RowSkeleton /> : (
            <HorizontalRow>
              {archive.map((v) => <VideoCard key={v.youtubeId} v={v} />)}
            </HorizontalRow>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */
function Section({ title, href, t, children }: {
  title: string; href: string; t: (k: string) => string; children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-app">{title}</h2>
        <Link href={href}
          className="group text-[13px] font-semibold text-muted hover:text-accent transition-colors flex items-center gap-1">
          {t("see_more")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="transition-transform group-hover:translate-x-0.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>
      </div>
      {children}
    </section>
  );
}

function HorizontalRow({ children }: { children: React.ReactNode }) {
  return <ScrollRow>{children}</ScrollRow>;
}

function VideoCard({ v }: { v: Video }) {
  const { has, add, remove } = useWatchlistStore();
  const isSaved = has(v.youtubeId);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) remove(v.youtubeId);
    else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
  }

  return (
    <Link href={`/vod/${v.youtubeId}`}
      className="group shrink-0 w-[220px] sm:w-[250px] md:w-[280px] block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <img src={v.thumbnailUrl} alt={v.title}
          className="w-full h-full object-cover" loading="lazy" />

        {/* Duration */}
        {v.duration > 0 && (
          <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums">
            {formatDuration(v.duration)}
          </span>
        )}

        {/* Hover overlay (heart + title) */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Heart top-right */}
          <button onClick={toggleSave} aria-label="Save"
            className={cn(
              "absolute top-2 right-2 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center transition-colors",
              isSaved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-black/80",
            )}>
            <svg width="14" height="14" viewBox="0 0 24 24"
              fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          {/* Bottom gradient + title */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
            <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2 drop-shadow">
              {v.title}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[13.5px] text-app line-clamp-2 leading-snug group-hover:text-accent transition-colors px-0.5">
        {v.title}
      </p>
    </Link>
  );
}

function PosterCard({ v }: { v: Video }) {
  const { has, add, remove } = useWatchlistStore();
  const isSaved = has(v.youtubeId);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) remove(v.youtubeId);
    else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
  }

  return (
    <Link href={`/vod/${v.youtubeId}`}
      className="group shrink-0 w-[150px] sm:w-[170px] md:w-[200px] block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <img src={v.thumbnailUrl} alt={v.title}
          className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-accent text-white text-[10px] font-bold uppercase tracking-wider">VOD</span>

        {/* Hover overlay — heart top-right */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={toggleSave} aria-label="Save"
            className={cn(
              "absolute top-2 right-2 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center transition-colors",
              isSaved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-black/80",
            )}>
            <svg width="14" height="14" viewBox="0 0 24 24"
              fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2 drop-shadow">
            {v.title}
          </p>
        </div>
      </div>
    </Link>
  );
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <Link href={`/bundles/${bundle.id}`}
      className="group shrink-0 w-[320px] sm:w-[360px] block">
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <img src={bundle.thumbnailUrl} alt={bundle.title}
          className="w-full h-full object-cover transition-transform duration-[700ms] group-hover:scale-[1.04]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        {bundle.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wider">
            {bundle.category.label}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">
            {bundle.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

function RowSkeleton({ wide, poster }: { wide?: boolean; poster?: boolean }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={cn("shrink-0 rounded-xl",
          wide   ? "w-[360px] aspect-[16/10]"
        : poster ? "w-[200px] aspect-[2/3]"
                 : "w-[260px] aspect-video")} />
      ))}
    </div>
  );
}
