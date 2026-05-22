"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VodPlayer } from "@/components/player/VodPlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/layout/UpgradePrompt";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { formatDuration, formatViews } from "@/lib/utils";
import { useWatchlistStore } from "@/store/watchlistStore";
import api from "@/lib/api";

interface VideoDetail {
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
  channelTitle: string;
  accessKind?: "archive" | "library" | "bundle";
  price?: number;
  bundleId?: string;
}

interface AccessDecision {
  allowed: boolean;
  reason?: "PLAN_REQUIRED" | "PURCHASE_REQUIRED" | "EXPIRED";
  requiredPlans?: string[];
}

interface RelatedVideo {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
}

export default function VodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { user } = useAuthStore();
  const { add, remove, has } = useWatchlistStore();
  const saved = has(id);

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessDecision | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [vRes, rRes] = await Promise.all([
          api.get<{ success: true; data: VideoDetail }>(`/api/vod/${id}`),
          api.get<{ success: true; data: { videos: RelatedVideo[] } }>("/api/vod/youtube", { params: { limit: 12 } }),
        ]);
        setVideo(vRes.data.data);
        setRelated(rRes.data.data.videos.filter((v) => v.youtubeId !== id));

        // Access check (зөвхөн нэвтэрсэн хэрэглэгчид)
        if (user && vRes.data.data.accessKind) {
          try {
            const a = await api.post<{ success: true; data: AccessDecision }>(
              "/api/subscription/access",
              { kind: vRes.data.data.accessKind, vodId: id },
            );
            setAccess(a.data.data);
          } catch {
            setAccess({ allowed: false, reason: "PLAN_REQUIRED" });
          }
        } else {
          setAccess({ allowed: !!user });
        }
      } catch {
        router.push("/vod");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router, user]);

  function toggleWatchlist() {
    if (!video) return;
    if (saved) remove(id);
    else add({ id, title: video.title, thumbnailUrl: video.thumbnailUrl, duration: video.duration });
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-[calc(var(--header-h)+16px)] pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="lg:w-72 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-28 aspect-video shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  const date = new Date(video.publishedAt).toLocaleDateString("mn-MN", {
    year: "numeric", month: "long", day: "numeric",
  });

  const descLines = (video.description ?? "")
    .split("\n")
    .filter((l) => !l.match(/https?:\/\//))
    .join("\n")
    .trim();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-[calc(var(--header-h)+16px)] pb-12 space-y-5">

      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <button onClick={() => router.back()} className="hover:text-app transition-colors flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          {t("back")}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left — player + info */}
        <div className="flex-1 min-w-0 space-y-5">

          {access?.allowed ? (
            <VodPlayer
              youtubeId={video.youtubeId}
              vodId={id}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              duration={video.duration}
            />
          ) : (
            <UpgradePrompt
              kind={video.accessKind === "bundle" ? "bundle" : "library"}
              vodId={id}
              price={video.price}
              title={video.title}
              backdrop={video.thumbnailUrl}
            />
          )}

          <h1 className="text-xl md:text-2xl font-bold text-app leading-snug">
            {video.title}
          </h1>

          {/* Meta + actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm text-muted flex-wrap">
              <span>{video.channelTitle}</span>
              {video.viewCount > 0 && (
                <><span>·</span><span>{formatViews(video.viewCount)} үзэлт</span></>
              )}
              <span>·</span><span>{date}</span>
              {video.duration > 0 && (
                <><span>·</span><span>{formatDuration(video.duration)}</span></>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Watchlist */}
              <button onClick={toggleWatchlist}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-[var(--border)] transition-colors group"
                title={saved ? t("watchlist") : t("watchlist")}>
                <svg width="22" height="22" viewBox="0 0 24 24"
                  fill={saved ? "#CF1E28" : "none"}
                  stroke={saved ? "#CF1E28" : "currentColor"}
                  strokeWidth="1.8"
                  className="transition-all group-hover:scale-110">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span className="text-[11px] text-muted">{saved ? t("saved_ok") : t("watchlist")}</span>
              </button>

              {/* Share */}
              <button
                onClick={() => navigator.share?.({ title: video.title, url: window.location.href }).catch(() => {})}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-[var(--border)] transition-colors group">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  className="text-muted group-hover:text-app transition-colors">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span className="text-[11px] text-muted">Share</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {descLines && (
            <div className="bg-surface rounded-xl p-4 border border-app">
              <p className={`text-sm text-sub whitespace-pre-line leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
                {descLines}
              </p>
              {descLines.length > 200 && (
                <button onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs text-[#0046A5] mt-2 hover:underline">
                  {descExpanded ? t("cancel") : t("details")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right — related */}
        <aside className="lg:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-muted mb-3">Бусад нэвтрүүлгүүд</h2>
          <div className="space-y-1">
            {related.slice(0, 10).map((v) => {
              const d = new Date(v.publishedAt).toLocaleDateString("mn-MN", { month: "short", day: "numeric" });
              return (
                <Link key={v.youtubeId} href={`/vod/${v.youtubeId}`}
                  className="flex gap-3 p-2 rounded-lg hover:bg-surface transition-colors group">
                  <div className="relative w-28 aspect-video rounded-md overflow-hidden shrink-0 bg-surface">
                    <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                    {v.duration > 0 && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded font-mono">
                        {formatDuration(v.duration)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                    <p className="text-xs text-app line-clamp-3 leading-snug group-hover:text-[#0046A5] transition-colors">
                      {v.title}
                    </p>
                    <p className="text-[11px] text-muted">{d}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

      </div>
    </div>
  );
}
