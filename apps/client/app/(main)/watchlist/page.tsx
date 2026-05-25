"use client";

import Link from "next/link";
import { useState } from "react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { formatDuration } from "@/lib/utils";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";

const PAGE_SIZE = 8;

export default function WatchlistPage() {
  const { items, remove } = useWatchlistStore();
  const { lang } = useSettingsStore();
  const t = useT();
  const [visible, setVisible] = useState(PAGE_SIZE);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-16">

      {items.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <p className="text-sub font-medium">{t("watchlist_empty")}</p>
            <p className="text-sm text-muted mt-1">
              {lang === "mn"
                ? "Бичлэгийн дэлгэрэнгүй дээрх \"Хадгалах\" товчийг ашиглана уу"
                : "Use the \"Save\" button on a video page to add it here"}
            </p>
          </div>
          <Link href="/"
            className="mt-2 px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-colors">
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.slice(0, visible).map((item) => (
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
                    <div className="w-10 h-10 rounded-full bg-accent/90 flex items-center justify-center shadow-xl">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-app line-clamp-2 leading-snug group-hover:text-accent transition-colors px-0.5">
                  {item.title}
                </p>
              </Link>

              <button
                onClick={() => remove(item.id)}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-semibold
                  opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)]"
                title={t("cancel")}
              >
                {lang === "mn" ? "Хасах" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <LoadMoreButton hasMore={visible < items.length}
        onMore={() => setVisible((v) => v + PAGE_SIZE)} />
    </div>
  );
}
