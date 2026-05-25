"use client";

import { Button } from "./Button";

/* "Цааш үзэх" товч — server/client pagination 2 төрлийн ажиллана.
   `hasMore=false` бол огт render хийгдэхгүй. */
export function LoadMoreButton({
  hasMore, loading, onMore,
}: {
  hasMore:  boolean;
  loading?: boolean;
  onMore:   () => void;
}) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" size="sm" onClick={onMore} loading={loading}>
        Цааш үзэх
      </Button>
    </div>
  );
}
