"use client";

import Link from "next/link";
import { ScrollRow } from "@/components/layout/ScrollRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/* Нүүр хуудасны row wrapper — title + "see more" link + scroll row.
   loading үед skeleton, эс бөгөөс children-ээ scroll row дотор харуулна. */
export function Section({
  title, href, t, loading, skeleton, children,
}: {
  title:     string;
  href:      string;
  t:         (k: string) => string;
  loading:   boolean;
  skeleton?: "wide" | "poster" | "landscape";
  children:  React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-app">{title}</h2>
        <Link href={href}
          className="group text-[13px] font-semibold text-muted hover:text-accent transition-colors flex items-center gap-1">
          {t("see_more")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="transition-transform group-hover:translate-x-0.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>
      </div>
      {loading ? <RowSkeleton variant={skeleton ?? "landscape"} /> : <ScrollRow>{children}</ScrollRow>}
    </section>
  );
}

function RowSkeleton({ variant }: { variant: "wide" | "poster" | "landscape" }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={cn("shrink-0 rounded-xl",
          variant === "wide"   ? "w-[360px] aspect-[16/10]"
        : variant === "poster" ? "w-[200px] aspect-[2/3]"
                               : "w-[260px] aspect-video")} />
      ))}
    </div>
  );
}
