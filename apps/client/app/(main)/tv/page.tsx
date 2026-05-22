"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { LivePlayer } from "@/components/player/LivePlayer";
import { EPGGrid } from "@/components/channel/EPGGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/layout/UpgradePrompt";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

/* ─────────────────────────────────────────────────────
   TV хуудас — бүтэц
   1. PLAYER (дээд, том)
   2. ОДОО / ДАРААГИЙН program info
   3. СУВГИЙН ХАЛЬЦ (хэвтээ scroll)
   4. ӨНӨӨДРИЙН ХӨТӨЛБӨР + EPG (tab)
   ───────────────────────────────────────────────────── */

interface EpgProgram {
  id: string; title: string; startTime: string; endTime: string; category?: string;
}
interface EpgChannel { id: string; name: string; slug: string; programs: EpgProgram[]; }

const TEST_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const CHANNELS: (Channel & { isRadio?: boolean; logo: string; tag?: string })[] = [
  { id: "ch1", name: "МНБ 1",        slug: "mnb1",         orderIndex: 1, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    tag: "Үндсэн" },
  { id: "ch2", name: "МНБ News",      slug: "mnb-news",     orderIndex: 2, isActive: true, streamUrl: "", thumbnailUrl: "/mnews.png",     logo: "/mnews.png",    tag: "Мэдээ"  },
  { id: "ch3", name: "МНБ Sport",     slug: "mnb-sport",    orderIndex: 3, isActive: true, streamUrl: "", thumbnailUrl: "/mnbsport.jpg",  logo: "/mnbsport.jpg", tag: "Спорт"  },
  { id: "ch4", name: "МНБ Family",    slug: "mnb-family",   orderIndex: 4, isActive: true, streamUrl: "", thumbnailUrl: "/mnbfamily.png", logo: "/mnbfamily.png",tag: "Гэр бүл" },
  { id: "ch5", name: "МНБ World",     slug: "mnb-world",    orderIndex: 5, isActive: true, streamUrl: "", thumbnailUrl: "/mnbworld.jpg",  logo: "/mnbworld.jpg", tag: "Дэлхий" },
  { id: "ch6", name: "МНБ Радио",     slug: "mnb-radio",    orderIndex: 6, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    isRadio: true, tag: "Радио" },
  { id: "ch7", name: "Bluesky Radio", slug: "bluesky-radio",orderIndex: 7, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    isRadio: true, tag: "Радио" },
];

type Tab = "today" | "epg";

function TvContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useSettingsStore();
  const t = useT();

  const initialSlug = params.get("ch") ?? CHANNELS[0].slug;
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [epgChannels, setEpgChannels] = useState<EpgChannel[]>([]);
  const [epgLoading, setEpgLoading]   = useState(true);
  const [tab, setTab] = useState<Tab>("today");
  const [canPlay, setCanPlay] = useState<boolean | null>(null);

  const active = CHANNELS.find((c) => c.slug === activeSlug) ?? CHANNELS[0];
  const streamUrl = active.streamUrl || TEST_STREAM;

  useEffect(() => {
    api.get<{ success: true; data: { channels: EpgChannel[] } }>("/api/channels/epg")
      .then((r) => setEpgChannels(r.data.data.channels))
      .catch(() => {})
      .finally(() => setEpgLoading(false));
  }, []);

  /* Live-TV plan access — TV / COMBO шаардлагатай */
  useEffect(() => {
    if (!user) { setCanPlay(false); return; }
    api.post<{ success: true; data: { allowed: boolean } }>(
      "/api/subscription/access",
      { kind: "live-tv" },
    ).then((r) => setCanPlay(r.data.data.allowed))
     .catch(() => setCanPlay(false));
  }, [user?.id]);

  const now = new Date();
  const activeEpg = epgChannels.find((c) => c.slug === activeSlug);
  const currentProgram = activeEpg?.programs.find(
    (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now,
  );
  const nextProgram = useMemo(() => {
    const upcoming = (activeEpg?.programs ?? []).filter((p) => new Date(p.startTime) > now);
    return upcoming.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0];
  }, [activeEpg, now.getTime()]);

  function selectChannel(slug: string) {
    setActiveSlug(slug);
    router.replace(`/tv?ch=${slug}`, { scroll: false });
  }

  /* ── Тулгуурлах хэлбэрүүд ─────────────────────── */
  function fmtTime(d: string | Date) {
    return new Date(d).toLocaleTimeString(lang === "mn" ? "mn-MN" : "en-US",
      { hour: "2-digit", minute: "2-digit" });
  }

  function progressPct(p: EpgProgram) {
    const s = +new Date(p.startTime);
    const e = +new Date(p.endTime);
    const r = ((Date.now() - s) / (e - s)) * 100;
    return Math.max(0, Math.min(100, r));
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+16px)] pb-12 space-y-5">

      {/* ── MOBILE: горизонталь channel chip strip ──────── */}
      <div className="lg:hidden -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {CHANNELS.map((ch) => {
            const isActive = activeSlug === ch.slug;
            return (
              <button key={ch.slug} onClick={() => selectChannel(ch.slug)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all whitespace-nowrap",
                  isActive
                    ? "bg-accent border-accent text-white"
                    : "bg-card border-app text-sub hover:text-app",
                )}>
                {!ch.isRadio && (
                  <span className={cn("w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-white animate-pulse-soft" : "bg-[var(--danger)] animate-pulse-soft")} />
                )}
                {ch.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PLAYER + sidebar (desktop only) ─────────── */}
      <section className="grid lg:grid-cols-[1fr_320px] gap-5">
        {/* Player */}
        <div className="space-y-3">
          {canPlay === null ? (
            <Skeleton className="aspect-video w-full rounded-xl" />
          ) : canPlay ? (
            <LivePlayer streamUrl={streamUrl} channelName={active.name} poster={active.thumbnailUrl} />
          ) : (
            <UpgradePrompt kind="live-tv" backdrop={active.thumbnailUrl} />
          )}

          {/* Channel header */}
          <div className="flex items-center gap-3 surface-base rounded-xl p-3.5">
            <div className="relative h-10 w-16 sm:h-11 sm:w-20 rounded-md overflow-hidden bg-black shrink-0">
              <Image src={active.logo} alt={active.name} fill sizes="80px" className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-app truncate">{active.name}</h2>
                {active.tag && (
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-card text-muted">
                    {active.tag}
                  </span>
                )}
              </div>
              {currentProgram ? (
                <p className="text-sm text-sub mt-0.5 truncate">
                  {currentProgram.title}
                  <span className="text-muted ml-2 text-xs hidden sm:inline">
                    {fmtTime(currentProgram.startTime)} – {fmtTime(currentProgram.endTime)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted mt-0.5">
                  {active.isRadio ? (lang === "mn" ? "Радио" : "Radio") : t("channels")}
                </p>
              )}
              {currentProgram && (
                <div className="mt-2 h-1 bg-input rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${progressPct(currentProgram)}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channels list (DESKTOP sidebar only — mobile-аас chip ribbon ашиглана) */}
        <aside className="hidden lg:block surface-base rounded-xl p-2 max-h-[480px] overflow-y-auto">
          {CHANNELS.map((ch) => {
            const isActive = activeSlug === ch.slug;
            const onAir = epgChannels.find((c) => c.slug === ch.slug)?.programs
              .find((p) => new Date(p.startTime) <= now && new Date(p.endTime) > now);
            return (
              <button key={ch.slug} onClick={() => selectChannel(ch.slug)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
                  isActive ? "bg-accent-soft" : "hover:bg-card-hover",
                )}>
                <div className="relative h-9 w-16 rounded-md overflow-hidden bg-black shrink-0">
                  <Image src={ch.logo} alt={ch.name} fill sizes="64px" className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-semibold truncate",
                    isActive ? "text-accent" : "text-app")}>
                    {ch.name}
                  </p>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {onAir ? onAir.title : (ch.isRadio ? (lang === "mn" ? "Радио" : "Radio") : "—")}
                  </p>
                </div>
                {!ch.isRadio && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft shrink-0" />}
              </button>
            );
          })}
        </aside>
      </section>

      {/* ── TABS: Өнөөдрийн хөтөлбөр / EPG ──────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex bg-card p-1 rounded-xl border border-app gap-1">
            {(["today", "epg"] as Tab[]).map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  tab === tb ? "bg-brand text-white shadow-card"
                             : "text-sub hover:text-app",
                )}>
                {tb === "today"
                  ? (lang === "mn" ? "Өнөөдрийн хөтөлбөр" : "Today's schedule")
                  : (lang === "mn" ? "7 өдрийн EPG"      : "7-day EPG")}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted hidden md:block">
            {active.name}
          </p>
        </div>

        {tab === "today" ? (
          epgLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <TodaySchedule programs={activeEpg?.programs ?? []} lang={lang} />
          )
        ) : (
          epgLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <EPGGrid channels={epgChannels} activeChannelSlug={activeSlug} onChannelSelect={selectChannel} />
          )
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Today schedule list — энгийн, ойлгомжтой
───────────────────────────────────────────────────── */
function TodaySchedule({ programs, lang }: { programs: EpgProgram[]; lang: "mn" | "en" }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (d: "l" | "r") => scrollRef.current?.scrollBy({ left: d === "r" ? 360 : -360, behavior: "smooth" });

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  const today = programs.filter((p) => {
    const s = new Date(p.startTime);
    return s >= todayStart && s <= todayEnd;
  });

  if (today.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted bg-card rounded-xl border border-app">
        {lang === "mn" ? "Өнөөдрийн хөтөлбөр алга" : "No schedule for today"}
      </p>
    );
  }

  /* Horizontal scroll cards (Korean OTT card pattern) */
  return (
    <div className="relative group/sched">
      <button onClick={() => scroll("l")} aria-label="prev"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app shadow-card items-center justify-center hidden group-hover/sched:flex hover:bg-card-hover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button onClick={() => scroll("r")} aria-label="next"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-10 h-10 rounded-full bg-elevated border border-app shadow-card items-center justify-center hidden group-hover/sched:flex hover:bg-card-hover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {today.map((p) => {
          const start = new Date(p.startTime);
          const end   = new Date(p.endTime);
          const isCurrent = start <= now && end > now;
          const isPast    = end <= now;
          const isFuture  = start > now;
          const fmt = (d: Date) => d.toLocaleTimeString(lang === "mn" ? "mn-MN" : "en-US",
            { hour: "2-digit", minute: "2-digit" });

          const progress = isCurrent
            ? Math.min(100, Math.max(0, ((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
            : 0;

          return (
            <div key={p.id}
              className={cn(
                "shrink-0 w-[260px] sm:w-[280px] relative bg-card border rounded-xl p-3.5 flex flex-col gap-2 transition-all",
                isCurrent ? "border-accent" : "border-app hover:border-strong",
                isPast    && "opacity-50",
              )}>
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-[13.5px] leading-snug line-clamp-2 flex-1 font-medium",
                  isCurrent ? "text-app" : "text-app")}>
                  {p.title}
                </p>
                {isPast && (
                  <button className="shrink-0 px-2.5 py-1 rounded-full border border-app text-[10.5px] font-semibold text-sub hover:text-app">
                    {lang === "mn" ? "Дахин үзэх" : "Replay"}
                  </button>
                )}
                {isCurrent && (
                  <button className="shrink-0 px-2.5 py-1 rounded-full bg-accent text-white text-[10.5px] font-bold">
                    {lang === "mn" ? "Шууд үзэх" : "Watch live"}
                  </button>
                )}
                {isFuture && (
                  <span className="shrink-0 w-7 h-7 rounded-full border border-app flex items-center justify-center text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                )}
              </div>

              <p className={cn("text-[12px] font-mono tabular-nums mt-auto",
                isCurrent ? "text-accent font-bold" : "text-muted")}>
                {fmt(start)} <span className="opacity-60">–</span> {fmt(end)}
              </p>

              {isCurrent && (
                <div className="absolute left-3 right-3 -bottom-px h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TvPage() {
  return <Suspense><TvContent /></Suspense>;
}
