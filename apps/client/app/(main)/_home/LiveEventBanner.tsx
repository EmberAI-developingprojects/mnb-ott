"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import type { ApiChannel } from "./types";

interface LiveEvent extends ApiChannel {
  endsAt?: string | null;
  price?:  number | null;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LiveEventBanner({ events }: { events: LiveEvent[] }) {
  const { lang } = useSettingsStore();
  const [now, setNow] = useState<number>(() => Date.now());

  /* 1s tick — countdown харагдах үед л шинэчилнэ */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Зөвхөн идэвхтэй (endsAt > now эсвэл endsAt undefined) event-ууд */
  const active = events.filter((e) => !e.endsAt || new Date(e.endsAt).getTime() > now);
  if (active.length === 0) return null;

  const event = active[0];
  const remaining = event.endsAt ? new Date(event.endsAt).getTime() - now : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 pt-4">
      <Link href="/live"
        className="group relative block overflow-hidden rounded-2xl border border-[var(--danger)]/30
          bg-gradient-to-r from-[var(--danger)]/15 via-[var(--danger)]/5 to-transparent
          hover:border-[var(--danger)]/60 transition-colors">

        {/* Background image — event-ийн thumbnail (хэрэв байгаа бол) */}
        {event.thumbnailUrl && (
          <div className="absolute inset-0 opacity-30">
            <Image src={event.thumbnailUrl} alt="" fill sizes="100vw"
              className="object-cover" priority={false} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          </div>
        )}

        <div className="relative flex items-center gap-4 p-4 sm:p-5">
          {/* LIVE pulse badge */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--danger)] text-white">
            <span className="flex h-2 w-2 relative">
              <span className="absolute inset-0 rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="text-[11px] sm:text-xs font-bold tracking-wider">LIVE</span>
          </div>

          {/* Title + countdown */}
          <div className="flex-1 min-w-0">
            <p className="text-app text-sm sm:text-base font-bold truncate">{event.name}</p>
            <p className="text-muted text-[11px] sm:text-xs mt-0.5">
              {remaining !== null ? (
                <>
                  {lang === "mn" ? "Дуусахад " : "Ends in "}
                  <span className="font-mono tabular-nums text-app/80">{fmtCountdown(remaining)}</span>
                </>
              ) : (
                lang === "mn" ? "Одоо явагдаж байна" : "Live now"
              )}
            </p>
          </div>

          {/* CTA — desktop-д "Үзэх" товч, mobile-д сум */}
          <div className="shrink-0 flex items-center gap-1.5 text-app font-semibold text-sm">
            <span className="hidden sm:inline">{lang === "mn" ? "Үзэх" : "Watch"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
