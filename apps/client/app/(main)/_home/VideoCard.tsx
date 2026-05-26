"use client";

import Link from "next/link";
import Image from "next/image";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatDuration, cn } from "@/lib/utils";
import type { Video } from "./types";

/* Landscape (16:9) video card — Архив row-д ашиглагдана.
   Hover үед heart toggle + title overlay харуулна. */
export function VideoCard({ v }: { v: Video }) {
  const { has, add, remove } = useWatchlistStore();
  const isSaved = has(v.youtubeId);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (isSaved) remove(v.youtubeId);
    else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
  }

  return (
    <Link href={`/vod/${v.youtubeId}`}
      className="group shrink-0 w-[220px] sm:w-[250px] md:w-[280px] block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <Image src={v.thumbnailUrl} alt={v.title} fill
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 35vw, 280px"
          className="object-cover" loading="lazy" />

        {v.duration > 0 && (
          <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums">
            {formatDuration(v.duration)}
          </span>
        )}

        {/* Mobile-д үргэлж visible, desktop-д hover-ээр reveal (`lg:` breakpoint). */}
        <div className="absolute inset-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
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

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
            <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2 drop-shadow">
              {v.title}
            </p>
          </div>
        </div>
      </div>

    </Link>
  );
}
