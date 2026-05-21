"use client";

import Link from "next/link";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useT } from "@/store/settingsStore";
import { formatDuration } from "@/lib/utils";

export default function WatchlistPage() {
  const { items, remove } = useWatchlistStore();
  const t = useT();

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 space-y-6">

      <h1 className="text-2xl font-bold text-app">{t("watchlist")}</h1>

      {items.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div>
            <p className="text-sub font-medium">{t("watchlist_empty")}</p>
            <p className="text-sm text-muted mt-1">{t("watchlist_hint")}</p>
          </div>
          <Link href="/"
            className="mt-2 px-6 py-2.5 bg-[#0046A5] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <Link href={item.id.startsWith("show-") ? `/vod/shows/${item.id.replace("show-", "")}` : `/vod/${item.id}`}
                className="block space-y-2">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {item.duration > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-[#0046A5]/90 flex items-center justify-center shadow-xl">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-app line-clamp-2 leading-snug group-hover:text-[#0046A5] transition-colors px-0.5">
                  {item.title}
                </p>
              </Link>

              <button
                onClick={() => remove(item.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#CF1E28]/80"
                title={t("cancel")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>

              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#CF1E28" stroke="#CF1E28" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
