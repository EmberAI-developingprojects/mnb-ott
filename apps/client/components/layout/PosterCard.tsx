"use client";

import Link from "next/link";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  href:        string;
  id:          string;     // watchlist toggle-д ашиглах
  title:       string;
  thumbnailUrl:string;
  duration?:   number;
  genre?:      string;
}

/* Poster card (2:3)
   ─────────────────────────────────────────────
   Default : зөвхөн poster (текст байхгүй)
   Hover   : цэнхэр ring + heart + bottom info overlay
   Үнэ нь зөвхөн дэлгэрэнгүй хуудаст харагдана.
*/
export function PosterCard({ href, id, title, thumbnailUrl, duration, genre }: Props) {
  const { has, add, remove } = useWatchlistStore();
  const saved = has(id);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved) remove(id);
    else add({ id, title, thumbnailUrl, duration: duration ?? 0 });
  }

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card
        ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <img src={thumbnailUrl} alt={title}
          className="w-full h-full object-cover" loading="lazy" />

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Heart top-right */}
          <button onClick={toggleSave} aria-label="Save"
            className={cn(
              "absolute top-2 right-2 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center transition-colors",
              saved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-black/80",
            )}>
            <svg width="15" height="15" viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          {/* Bottom gradient + info */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10 space-y-2">
            <h3 className="text-white text-[13px] font-semibold leading-snug line-clamp-2">{title}</h3>
            {(genre || duration) && (
              <div className="flex flex-wrap gap-1.5">
                {genre && (
                  <span className="px-2 py-0.5 rounded-full border border-white/30 text-white/85 text-[10px] font-medium">
                    {genre}
                  </span>
                )}
                {duration && duration > 0 ? (
                  <span className="px-2 py-0.5 rounded-full border border-white/30 text-white/85 text-[10px] font-medium tabular-nums">
                    {formatDuration(duration)}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
