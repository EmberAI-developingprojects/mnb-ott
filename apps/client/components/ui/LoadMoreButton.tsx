"use client";

import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

/* "Цааш үзэх" товч — server pagination-д ч, client slice-д ч хэрэглэгдэнэ.
   `hasMore=false` бол огт render хийгдэхгүй. `loading=true` үед spinner-тэй. */
export function LoadMoreButton({
  hasMore, loading, onMore, className,
}: {
  hasMore:    boolean;
  loading?:   boolean;
  onMore:     () => void;
  className?: string;
}) {
  const { lang } = useSettingsStore();
  if (!hasMore) return null;

  return (
    <div className={cn("flex justify-center pt-6", className)}>
      <button onClick={onMore} disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-app
          bg-card hover:bg-card-hover text-app text-sm font-semibold transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed">
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-app border-t-transparent rounded-full animate-spin" />
        )}
        {lang === "mn" ? "Цааш үзэх" : "Load more"}
      </button>
    </div>
  );
}
