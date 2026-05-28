"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { PosterCard } from "@/components/layout/PosterCard";
import { useT } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface BundleItem {
  youtubeId: string; title: string; thumbnailUrl: string;
  duration: number; price: number;
}
interface BundleCategory { id: string; label: string; }
interface Bundle {
  id: string; title: string; description?: string;
  thumbnailUrl: string; category: BundleCategory; items: BundleItem[];
}

export default function BundlesPage() {
  const t = useT();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: true; data: { bundles: Bundle[] } }>("/api/vod/bundles")
      .then((r) => setBundles(r.data.data.bundles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 pt-[calc(var(--header-h)+24px)] pb-16 space-y-12">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)
        : bundles.map((b) => (
            <BundleRow key={b.id} bundle={b} seeAllLabel={t("see_all_short")} />
          ))
      }
    </div>
  );
}

function BundleRow({ bundle, seeAllLabel }: { bundle: Bundle; seeAllLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: "l" | "r") => ref.current?.scrollBy({ left: d === "r" ? 320 : -320, behavior: "smooth" });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-app">{bundle.title}</h2>
        <Link href={`/bundles/${bundle.id}`}
          className="text-[13px] font-semibold text-accent hover:underline">
          {seeAllLabel}
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
          {bundle.items.map((v) => (
            <div key={v.youtubeId} className="shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
              <PosterCard
                href={`/vod/${v.youtubeId}`}
                id={v.youtubeId}
                title={v.title}
                thumbnailUrl={v.thumbnailUrl}
                duration={v.duration} />
            </div>
          ))}
        </div>
      </div>
    </section>
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
