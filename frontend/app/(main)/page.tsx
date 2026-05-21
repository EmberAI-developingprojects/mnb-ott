"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { useT } from "@/store/settingsStore";
import { formatDuration } from "@/lib/utils";
import api from "@/lib/api";

const CHANNELS = [
  { slug: "mnb1",         name: "МНБ 1",        logo: "/mnbtv.png",      isRadio: false },
  { slug: "mnb-news",     name: "МНБ News",      logo: "/mnews.png",      isRadio: false },
  { slug: "mnb-sport",    name: "МНБ Sport",     logo: "/mnbsport.jpg",   isRadio: false },
  { slug: "mnb-family",   name: "МНБ Family",    logo: "/mnbfamily.png",  isRadio: false },
  { slug: "mnb-world",    name: "МНБ World",     logo: "/mnbworld.jpg",   isRadio: false },
  { slug: "mnb-radio",    name: "МНБ Радио",     logo: "/mnbtv.png",      isRadio: true  },
  { slug: "bluesky-radio",name: "Bluesky Radio", logo: "/mnbtv.png",      isRadio: true  },
];

type Genre = "Мэдээ" | "Нэвтрүүлэг" | "Хүүхэд" | "Спорт" | "Баримтат" | "Бусад";
const GENRE_ORDER: Genre[] = ["Мэдээ", "Нэвтрүүлэг", "Хүүхэд", "Спорт", "Баримтат", "Бусад"];

interface Show  { slug: string; name: string; thumbnailUrl: string; latestId: string; genre: Genre; }
interface Video { youtubeId: string; title: string; thumbnailUrl: string; duration: number; description: string; publishedAt: string; }

export default function HomePage() {
  const t = useT();
  const [shows, setShows]     = useState<Show[]>([]);
  const [hero, setHero]       = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    Promise.all([
      api.get<{ success: true; data: { shows: Show[] } }>("/api/vod/shows"),
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/youtube", { params: { limit: 5 } }),
    ]).then(([s, r]) => {
      setShows(s.data.data.shows);
      setHero(r.data.data.videos);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hero.length < 2) return;
    heroTimer.current = setInterval(() => setHeroIdx((i) => (i + 1) % hero.length), 6000);
    return () => clearInterval(heroTimer.current);
  }, [hero.length]);

  function goHero(i: number) {
    setHeroIdx(i);
    clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => setHeroIdx((x) => (x + 1) % hero.length), 6000);
  }

  const byGenre = GENRE_ORDER
    .map((g) => ({ genre: g, shows: shows.filter((s) => s.genre === g) }))
    .filter((g) => g.shows.length > 0);

  const current = hero[heroIdx];

  return (
    <div className="min-h-screen bg-app">

      {/* ── HERO BANNER ──────────────────────────────── */}
      <section className="relative h-[56vw] max-h-[620px] min-h-[360px] overflow-hidden">
        {hero.map((v, i) => (
          <div key={v.youtubeId}
            className={`absolute inset-0 transition-opacity duration-700 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}>
            <img
              src={`https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`}
              alt={v.title}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Gradient overlays — always dark (over image) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080F] via-[#08080F]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080F] via-transparent to-[#08080F]/30" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end pb-10 px-6 md:px-10 max-w-[1400px] mx-auto">
          {loading || !current ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-80" />
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          ) : (
            <div className="space-y-3 max-w-xl" key={current.youtubeId}>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>МҮОНРТ</span>
                <span>·</span>
                <span>{new Date(current.publishedAt).toLocaleDateString("mn-MN", { month: "short", day: "numeric" })}</span>
                {current.duration > 0 && (
                  <><span>·</span><span>{formatDuration(current.duration)}</span></>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                {current.title}
              </h1>

              {current.description && (
                <p className="text-sm text-white/60 line-clamp-2 leading-relaxed hidden sm:block">
                  {current.description.split("\n").find((l) => l.trim() && !l.match(/https?:\/\//)) ?? ""}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Link href={`/vod/${current.youtubeId}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#08080F] text-sm font-bold rounded-full
                    hover:bg-white/90 active:scale-95 transition-all shadow-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  {t("watch")}
                </Link>
                <Link href="/vod/shows"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur text-white text-sm font-semibold rounded-full
                    hover:bg-white/20 border border-white/10 transition-all">
                  {t("details")}
                </Link>
              </div>
            </div>
          )}

          {/* Navigation dots */}
          {hero.length > 1 && (
            <div className="flex items-center gap-1.5 mt-5">
              {hero.map((_, i) => (
                <button key={i} onClick={() => goHero(i)}
                  className={`transition-all rounded-full ${
                    i === heroIdx ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Arrow navigation */}
        {hero.length > 1 && (
          <>
            <button onClick={() => goHero((heroIdx - 1 + hero.length) % hero.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10
                flex items-center justify-center text-white hover:bg-black/60 transition-all backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => goHero((heroIdx + 1) % hero.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10
                flex items-center justify-center text-white hover:bg-black/60 transition-all backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
      </section>

      {/* ── 7 СУВАГ ──────────────────────────────────── */}
      <section className="px-4 md:px-8 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {CHANNELS.map((ch) => (
              <Link key={ch.slug} href={`/tv?ch=${ch.slug}`}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface
                  border border-app hover:border-[#0046A5]/50 hover:bg-[#0046A5]/8
                  transition-all overflow-hidden">
                <div className="relative h-8 aspect-[2/1] rounded-md overflow-hidden shrink-0 bg-black ring-1 ring-[var(--border)] group-hover:ring-[#0046A5]/40 transition-all">
                  <Image src={ch.logo} alt={ch.name} fill className="object-contain" />
                  {ch.isRadio && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="flex-1 min-w-0 text-xs font-semibold text-app truncate group-hover:text-[#0046A5] transition-colors">
                  {ch.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENRE ROWS ───────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-12 space-y-9">
        {loading
          ? GENRE_ORDER.slice(0, 4).map((g) => <RowSkeleton key={g} title={g} />)
          : byGenre.map(({ genre, shows: gs }) => (
            <HRow key={genre} title={genre} href={`/vod/genre/${encodeURIComponent(genre)}`} seeAll={t("see_more")}>
              {gs.map((s) => <ShowCard key={s.latestId} show={s} />)}
            </HRow>
          ))
        }
      </div>
    </div>
  );
}

// ── Horizontal row ────────────────────────────────────

function HRow({ title, href, seeAll, children }: {
  title: string; href: string; seeAll: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: "l" | "r") => ref.current?.scrollBy({ left: d === "r" ? 340 : -340, behavior: "smooth" });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-app">{title}</h2>
        <Link href={href} className="text-sm text-muted hover:text-app transition-colors flex items-center gap-1">
          {seeAll}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
      </div>
      <div className="relative group/row">
        <button onClick={() => scroll("l")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full
            bg-card border border-app items-center justify-center shadow-lg
            hidden group-hover/row:flex hover:bg-[var(--border-strong)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button onClick={() => scroll("r")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full
            bg-card border border-app items-center justify-center shadow-lg
            hidden group-hover/row:flex hover:bg-[var(--border-strong)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

// ── Show card ─────────────────────────────────────────

function ShowCard({ show }: { show: Show }) {
  return (
    <Link href={`/vod/shows/${show.slug}`} className="group shrink-0 w-[180px] sm:w-[200px] md:w-[220px] block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
        <img src={show.thumbnailUrl} alt={show.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <p className="absolute bottom-0 inset-x-0 p-2.5 text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
          {show.name}
        </p>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-[#0046A5]/90 flex items-center justify-center shadow-xl">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white" className="translate-x-0.5"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RowSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <span className="text-base font-bold text-app block">{title}</span>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-[220px] aspect-video rounded-xl" />
        ))}
      </div>
    </div>
  );
}
