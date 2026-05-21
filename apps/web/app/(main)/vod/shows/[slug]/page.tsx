"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDuration, formatViews } from "@/lib/utils";
import { useWatchlistStore } from "@/store/watchlistStore";
import api from "@/lib/api";

interface Show {
  slug: string;
  name: string;
  thumbnailUrl: string;
  episodeCount: number;
  latestDate: string;
  genre: string;
}

interface Episode {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
}

export default function ShowPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { add, remove, has } = useWatchlistStore();
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const saved = show ? has(`show-${slug}`) : false;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<{ success: true; data: { show: Show; episodes: Episode[] } }>(
          `/api/vod/shows/${slug}`
        );
        setShow(res.data.data.show);
        setEpisodes(res.data.data.episodes);
      } catch {
        router.push("/vod");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  const sorted = sortAsc ? [...episodes].reverse() : episodes;
  const latestEp = episodes[0];

  function toggleWatchlist() {
    if (!show) return;
    if (saved) remove(`show-${slug}`);
    else add({ id: `show-${slug}`, title: show.name, thumbnailUrl: show.thumbnailUrl, duration: 0 });
  }

  if (loading) return <PageSkeleton />;
  if (!show) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/vod" className="hover:text-app transition-colors">Архив</Link>
        <span className="text-muted">/</span>
        <span className="text-app">{show.name}</span>
      </nav>

      {/* Show hero */}
      {latestEp && (
        <div className="relative rounded-2xl overflow-hidden bg-card">
          <div className="absolute inset-0">
            <img
              src={latestEp.thumbnailUrl}
              alt={show.name}
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-dark-bg via-dark-bg/80 to-transparent" />
          </div>

          <div className="relative flex gap-6 p-6 md:p-8">
            {/* Thumbnail */}
            <Link
              href={`/vod/${latestEp.youtubeId}`}
              className="shrink-0 w-44 md:w-56 aspect-video rounded-xl overflow-hidden bg-surface group hidden sm:block"
            >
              <div className="relative w-full h-full">
                <img src={latestEp.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/0 group-hover:bg-primary/80 flex items-center justify-center transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"
                      className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-primary/80 text-white px-2.5 py-1 rounded-full font-medium">
                  {show.genre}
                </span>
                <span className="text-xs text-muted">МҮОНРТ</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-app">{show.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" />
                  </svg>
                  {show.episodeCount} анги
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(episodes.reduce((s, e) => s + e.duration, 0) / (episodes.length || 1) | 0)} дундаж
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vod/${latestEp.youtubeId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary rounded-lg text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  Үзэх
                </Link>
                {/* Watchlist */}
                <button onClick={toggleWatchlist}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl hover:bg-[var(--border)] transition-colors"
                  title={saved ? "Хасах" : "Дуртай жагсаалтад нэмэх"}>
                  <svg width="22" height="22" viewBox="0 0 24 24"
                    fill={saved ? "#CF1E28" : "none"}
                    stroke={saved ? "#CF1E28" : "currentColor"}
                    strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="text-[11px] text-muted">{saved ? "Хадгалсан" : "Дуртай"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-app">
          Бүх ангиуд
          <span className="text-muted font-normal text-sm ml-2">({episodes.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-app hover:bg-[var(--border)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sortAsc
                ? <><path d="M3 4h13M3 8h9M3 12h5"/><path d="M15 4l4 4-4 4"/></>
                : <><path d="M3 4h13M3 8h9M3 12h5"/><path d="M19 4v16M15 16l4 4 4-4"/></>}
            </svg>
            {sortAsc ? "Хуучинаас" : "Шинэ эхэнд"}
          </button>
          {/* View toggle */}
          <div className="flex bg-surface rounded-lg p-0.5">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`p-1.5 rounded-md transition-colors ${view === v ? "bg-card text-app" : "text-muted"}`}
              >
                {v === "grid" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Episodes */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((ep, i) => {
            const epNum = sortAsc ? i + 1 : episodes.length - i;
            return <EpisodeCard key={ep.youtubeId} ep={ep} epNum={epNum} />;
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((ep, i) => {
            const epNum = sortAsc ? i + 1 : episodes.length - i;
            return <EpisodeRow key={ep.youtubeId} ep={ep} epNum={epNum} />;
          })}
        </div>
      )}
    </div>
  );
}

// ── Episode карт (grid) ───────────────────────────────

function EpisodeCard({ ep, epNum }: { ep: Episode; epNum: number }) {
  const date = new Date(ep.publishedAt).toLocaleDateString("mn-MN", {
    month: "short", day: "numeric",
  });
  return (
    <Link href={`/vod/${ep.youtubeId}`} className="group block space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-surface">
        <img
          src={ep.thumbnailUrl} alt={ep.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-bold">
          {epNum}-р анги
        </span>
        {ep.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(ep.duration)}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/0 group-hover:bg-primary/80 transition-all flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"
              className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-app">{epNum}-р анги</p>
        <p className="text-xs text-muted">{date}</p>
      </div>
    </Link>
  );
}

// ── Episode мөр (list) ────────────────────────────────

function EpisodeRow({ ep, epNum }: { ep: Episode; epNum: number }) {
  const date = new Date(ep.publishedAt).toLocaleDateString("mn-MN", {
    year: "numeric", month: "short", day: "numeric",
  });
  return (
    <Link
      href={`/vod/${ep.youtubeId}`}
      className="flex gap-4 p-3 rounded-xl hover:bg-card transition-colors group"
    >
      <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-surface shrink-0">
        <img src={ep.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded font-mono">
          {formatDuration(ep.duration)}
        </span>
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-[var(--border-strong)] text-muted px-2 py-0.5 rounded font-medium shrink-0">
            {epNum}-р анги
          </span>
        </div>
        <p className="text-sm text-app line-clamp-2 leading-snug">{ep.title}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
          <span>{date}</span>
          {ep.viewCount > 0 && <span>{formatViews(ep.viewCount)} үзэлт</span>}
        </div>
      </div>
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    </div>
  );
}
