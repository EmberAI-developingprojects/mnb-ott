"use client";

import Link from "next/link";
import { ScrollRow } from "@/components/layout/ScrollRow";
import type { ApiChannel } from "./types";

/* Сувгийн pill — "МНБ News" гэх мэт нэртэй pill хэлбэрийн карт.
   TV/LIVE үед улаан LIVE dot, RADIO үед чанга яригчны icon байна. */
export function ChannelStrip({ channels }: { channels: ApiChannel[] }) {
  if (channels.length === 0) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-8">
      <ScrollRow center step={320}>
        {channels.map((ch) => {
          const isRadio = ch.kind === "RADIO";
          /* "МНБ News" → "News" — pill дотор label нэг мөрөнд гүйцэхгүйг сэргийлэхэд тус болно. */
          const label = ch.name.replace(/^МНБ\s*/i, "").trim() || ch.name;
          return (
            <Link key={ch.slug} href={ch.kind === "LIVE" ? "/live" : `/tv?ch=${ch.slug}`}
              className="group relative shrink-0 w-[140px] sm:w-[160px] aspect-[16/9] rounded-xl
                bg-card border border-app flex flex-col items-center justify-center
                ring-1 ring-transparent hover:ring-2 hover:ring-accent ring-inset transition-all duration-200 overflow-hidden">

              <div className="relative z-10 flex flex-col items-center">
                <span className="text-app text-[22px] sm:text-[24px] font-black tracking-tight leading-none drop-shadow">
                  MNB
                </span>
                <span className="text-accent text-[13px] font-semibold mt-1.5 uppercase tracking-wider drop-shadow">
                  {label}
                </span>
              </div>
              {!isRadio && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft z-10" />
              )}
              {isRadio && (
                <svg className="absolute top-2.5 right-2.5 text-muted z-10" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.24 6.15A2.99 2.99 0 0 0 2 8.66V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
              )}
            </Link>
          );
        })}
      </ScrollRow>
    </div>
  );
}
