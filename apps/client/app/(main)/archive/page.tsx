"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { PosterCard } from "@/components/layout/PosterCard";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type Genre = "Мэдээ" | "Нэвтрүүлэг" | "Хүүхэд" | "Спорт" | "Баримтат" | "Бусад";

interface Video {
  youtubeId: string; title: string; thumbnailUrl: string;
  duration: number; publishedAt: string; genre: Genre;
}

const GENRE_ORDER: Genre[] = ["Мэдээ", "Нэвтрүүлэг", "Хүүхэд", "Спорт", "Баримтат", "Бусад"];

function ArchiveContent() {
  const params = useSearchParams();
  const genreFilter = params.get("g");
  const { lang } = useSettingsStore();
  const [videos, setVideos]   = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/archive", { params: { all: 1 } })
      .then((r) => setVideos(r.data.data.videos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => {
    return GENRE_ORDER
      .map((g) => ({ genre: g, items: videos.filter((v) => v.genre === g) }))
      .filter((s) => s.items.length > 0);
  }, [videos]);

  const filtered = useMemo(
    () => genreFilter ? videos.filter((v) => v.genre === genreFilter) : [],
    [videos, genreFilter],
  );

  if (genreFilter) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-16">
        <h1 className="text-2xl md:text-3xl font-bold text-app mb-6">{genreFilter}</h1>
        {loading ? (
          <PosterGrid>
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}
          </PosterGrid>
        ) : (
          <PosterGrid>
            {filtered.map((v) => (
              <PosterCard key={v.youtubeId}
                href={`/vod/${v.youtubeId}`}
                id={v.youtubeId}
                title={v.title}
                thumbnailUrl={v.thumbnailUrl}
                duration={v.duration}
                genre={v.genre} />
            ))}
          </PosterGrid>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-16 space-y-12">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)
        : sections.map((s) => (
            <GenreRow key={s.genre} title={s.genre} items={s.items}
              seeAllHref={`/archive?g=${encodeURIComponent(s.genre)}`} lang={lang} />
          ))
      }
    </div>
  );
}

function GenreRow({ title, items, seeAllHref, lang }: {
  title: string; items: Video[]; seeAllHref: string; lang: "mn" | "en";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: "l" | "r") => ref.current?.scrollBy({ left: d === "r" ? 320 : -320, behavior: "smooth" });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-app">{title}</h2>
        <Link href={seeAllHref}
          className="text-[13px] font-semibold text-accent hover:underline">
          {lang === "mn" ? "Бүгдийг" : "See all"}
        </Link>
      </div>

      <div className="relative group/row -mx-1 px-1">
        <button onClick={() => scroll("l")} aria-label="prev"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app items-center justify-center shadow-card hidden group-hover/row:flex hover:bg-card-hover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button onClick={() => scroll("r")} aria-label="next"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app items-center justify-center shadow-card hidden group-hover/row:flex hover:bg-card-hover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <div ref={ref} className="flex gap-3 overflow-x-auto pb-1">
          {items.map((v) => (
            <div key={v.youtubeId} className="shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
              <PosterCard
                href={`/vod/${v.youtubeId}`}
                id={v.youtubeId}
                title={v.title}
                thumbnailUrl={v.thumbnailUrl}
                duration={v.duration}
                genre={v.genre} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PosterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
      {children}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("shrink-0 w-[180px] aspect-[2/3] rounded-xl")} />
        ))}
      </div>
    </section>
  );
}

export default function ArchivePage() {
  return (
    <Suspense>
      <ArchiveContent />
    </Suspense>
  );
}
