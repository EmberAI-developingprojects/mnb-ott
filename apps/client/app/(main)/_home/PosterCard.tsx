"use client";

import Link from "next/link";
import Image from "next/image";
import { useWatchlistStore } from "@/store/watchlistStore";
import { cn } from "@/lib/utils";
import type { Video } from "./types";

/* Portrait (2:3) poster card — Видео сан row-д ашиглагдана.
   VOD badge top-left, hover үед heart toggle top-right. */
export function PosterCard({ v }: { v: Video }) {
  const { has, add, remove } = useWatchlistStore();
  const isSaved = has(v.youtubeId);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (isSaved) remove(v.youtubeId);
    else add({ id: v.youtubeId, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
  }

  return (
    <Link href={`/vod/${v.youtubeId}`}
      className="group shrink-0 w-[150px] sm:w-[170px] md:w-[200px] block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <Image src={v.thumbnailUrl} alt={v.title} fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          className="object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-accent text-white text-[10px] font-bold uppercase tracking-wider">VOD</span>

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
