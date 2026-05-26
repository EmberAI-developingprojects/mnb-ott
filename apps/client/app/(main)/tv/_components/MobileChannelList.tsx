"use client";

import Image from "next/image";
import type { Channel } from "@/types";
import { cn } from "@/lib/utils";
import { FALLBACK_LOGO, type EpgChannel } from "./types";

/* Mobile-д суваг сонгоогүй үед — logo + одоо гарч буй хөтөлбөр (нэг мөр). */
export function MobileChannelList({
  channels, epgChannels, activeSlug, onSelect, fmtTime,
}: {
  channels:    Channel[];
  epgChannels: EpgChannel[];
  activeSlug:  string | null;
  onSelect:    (slug: string) => void;
  fmtTime:     (d: string | Date) => string;
}) {
  const now = new Date();
  return (
    <div className="lg:hidden">
      <div className="rounded-xl overflow-hidden bg-card">
        {channels.map((ch, i) => {
          const logo  = ch.thumbnailUrl || FALLBACK_LOGO;
          const onAir = epgChannels.find((c) => c.slug === ch.slug)?.programs
            .find((p) => new Date(p.startTime) <= now && new Date(p.endTime) > now);
          const isActive = activeSlug === ch.slug;
          return (
            <button key={ch.slug} onClick={() => onSelect(ch.slug)}
              className={cn(
                "w-full flex items-center gap-4 px-3 py-3.5 text-left active:opacity-70 transition-colors",
                i > 0 && "border-t border-[var(--border)]",
                isActive && "bg-card-hover",
              )}>
              <div className="relative h-14 w-20 rounded-md overflow-hidden bg-black shrink-0">
                <Image src={logo} alt={ch.name} fill sizes="80px" className="object-contain p-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-muted truncate">{ch.name}</p>
                {onAir ? (
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span className="text-[14px] font-bold text-app tabular-nums shrink-0">
                      {fmtTime(onAir.startTime)}
                    </span>
                    <span className="text-[14px] text-app truncate">{onAir.title}</span>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted mt-0.5">—</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
