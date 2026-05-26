"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";

interface Show {
  slug: string;
  name: string;
  thumbnailUrl: string;
  episodeCount: number;
  latestDate: string;
  latestId: string;
  genre: string;
}

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const router = useRouter();
  const decodedGenre = decodeURIComponent(genre);

  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: true; data: { shows: Show[] } }>("/api/vod/shows")
      .then((r) => {
        const filtered = r.data.data.shows.filter((s) => s.genre === decodedGenre);
        setShows(filtered);
      })
      .catch(() => router.push("/vod"))
      .finally(() => setLoading(false));
  }, [decodedGenre, router]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/archive" className="hover:text-app transition-colors">Архив</Link>
        <span className="text-muted">/</span>
        <span className="text-app">{decodedGenre}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app">{decodedGenre}</h1>
        </div>
        <Link href="/archive" className="text-sm text-primary hover:text-blue-400 transition-colors flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Буцах
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="py-20 text-center text-muted">Нэвтрүүлэг олдсонгүй</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shows.map((s) => (
              <Link key={s.latestId} href={`/vod/shows/${s.slug}`} className="group block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
                  <img
                    src={s.thumbnailUrl}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-white font-semibold text-sm line-clamp-2 leading-snug">{s.name}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center shadow-xl">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
