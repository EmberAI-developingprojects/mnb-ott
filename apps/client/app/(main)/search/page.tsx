"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { useT } from "@/store/settingsStore";
import { formatDuration, formatViews } from "@/lib/utils";
import api from "@/lib/api";

const PAGE_SIZE = 10;

interface SearchResult {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const t = useT();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setVisible(PAGE_SIZE);
    api.get<{ success: true; data: { videos: SearchResult[] } }>("/api/search", { params: { q } })
      .then((r) => setResults(r.data.data.videos ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-[calc(var(--header-h)+24px)] pb-12 space-y-6">

      {/* Query title */}
      {q && (
        <h1 className="text-xl font-bold text-app">
          &ldquo;{q}&rdquo; {t("search_title")}
        </h1>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.slice(0, visible).map((v) => {
            const date = new Date(v.publishedAt).toLocaleDateString("mn-MN", { month: "short", day: "numeric" });
            return (
              <Link key={v.youtubeId} href={`/vod/${v.youtubeId}`} className="group block space-y-2">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-surface">
                  <Image
                    src={v.thumbnailUrl} alt={v.title} fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {v.duration > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                      {formatDuration(v.duration)}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-accent/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm text-app line-clamp-2 leading-snug group-hover:text-accent transition-colors font-medium">
                    {v.title}
                  </p>
                  <p className="text-xs text-muted">{formatViews(v.viewCount)} үзэлт · {date}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {results.length > 0 && (
        <LoadMoreButton hasMore={visible < results.length}
          onMore={() => setVisible((v) => v + PAGE_SIZE)} />
      )}

      {!loading && results.length === 0 && q ? (
        <div className="py-20 text-center space-y-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p className="text-muted text-sm">&ldquo;{q}&rdquo; {t("search_none")}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>;
}
