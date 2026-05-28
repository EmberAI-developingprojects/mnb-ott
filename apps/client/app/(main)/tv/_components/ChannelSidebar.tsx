"use client";

import Image from "next/image";
import type { Channel } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/store/settingsStore";
import { FALLBACK_LOGO, type EpgChannel } from "./types";

/* Desktop sidebar — суваг бүрд logo + одоо гарч буй хөтөлбөр + цаг.
   Active үед зүүн талд босоо stripe + bg accent-soft.
   Улаан цэг байхгүй — RADIO icon хадгалагдсан, TV-д indicator байхгүй. */
export function ChannelSidebar({
  channels, epgChannels, activeSlug, lang, onSelect,
}: {
  channels:    Channel[];
  epgChannels: EpgChannel[];
  activeSlug:  string | null;
  lang:        "mn" | "en";
  onSelect:    (slug: string) => void;
}) {
  const t = useT();
  const nowMs = Date.now();
  /* lang нь зөвхөн toLocaleTimeString locale-д хэрэгтэй — UI string-ууд dict-руу */
  const fmt = (d: string | Date) => new Date(d).toLocaleTimeString(lang === "mn" ? "mn-MN" : "en-US",
    { hour: "2-digit", minute: "2-digit" });

  return (
    <aside className="hidden lg:block rounded-2xl bg-card border border-app overflow-hidden overflow-y-auto">
      {channels.map((ch, i) => {
        const isActive = activeSlug === ch.slug;
        const isRadio  = ch.kind === "RADIO";
        const logo     = ch.thumbnailUrl || FALLBACK_LOGO;
        const onAir = epgChannels.find((c) => c.slug === ch.slug)?.programs
          .find((p) => new Date(p.startTime).getTime() <= nowMs && new Date(p.endTime).getTime() > nowMs);

        /* Прогресс — одоо явж буй хөтөлбөрийн дотор хэр хол явсан */
        const progress = onAir
          ? Math.min(100, Math.max(0, ((nowMs - new Date(onAir.startTime).getTime()) /
              (new Date(onAir.endTime).getTime() - new Date(onAir.startTime).getTime())) * 100))
          : 0;

        return (
          <button key={ch.slug} onClick={() => onSelect(ch.slug)}
            className={cn(
              "relative w-full flex items-stretch gap-3 p-3 text-left transition-colors",
              i > 0 && "border-t border-[var(--border)]",
              isActive ? "bg-accent-soft" : "hover:bg-card-hover",
            )}>
            {/* Active stripe — зүүн талд босоо accent шугам */}
            {isActive && (
              <span aria-hidden="true"
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-accent" />
            )}

            {/* Logo container */}
            <div className="relative h-12 w-16 rounded-md overflow-hidden bg-black shrink-0">
              <Image src={logo} alt={ch.name} fill sizes="64px" className="object-contain p-1" />
              {isRadio && (
                /* RADIO indicator — speaker icon, нейтрал */
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  </svg>
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <p className={cn("text-[13.5px] font-semibold truncate",
                isActive ? "text-app" : "text-app")}>
                {ch.name}
              </p>

              {onAir ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-mono text-muted tabular-nums shrink-0">
                      {fmt(onAir.startTime)}
                    </span>
                    <span className="text-[12px] text-sub truncate">{onAir.title}</span>
                  </div>
                  {/* Жижиг прогресс bar — одоо явж буй нь хэр явсныг */}
                  <div className="h-[2px] bg-[var(--border)] rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all", isActive ? "bg-accent" : "bg-muted-strong")}
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-muted">
                  {isRadio ? t("radio_label") : "—"}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </aside>
  );
}
