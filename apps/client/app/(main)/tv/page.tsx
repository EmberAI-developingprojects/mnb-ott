"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LivePlayer } from "@/components/player/LivePlayer";
import { EPGGrid } from "@/components/channel/EPGGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/layout/UpgradePrompt";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";
import { TodaySchedule } from "./_components/TodaySchedule";
import { MobileChannelList } from "./_components/MobileChannelList";
import { ChannelSidebar } from "./_components/ChannelSidebar";
import { FALLBACK_LOGO, type EpgChannel, type EpgProgram } from "./_components/types";

type Tab = "today" | "epg";

function TvContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useSettingsStore();

  const initialSlug = params.get("ch");
  const [channels, setChannels]     = useState<Channel[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug);
  const [epgChannels, setEpgChannels] = useState<EpgChannel[]>([]);
  const [epgLoading, setEpgLoading]   = useState(true);
  const [tab, setTab] = useState<Tab>("today");
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  /* Mobile-д player харуулах эсэх — URL-д ?ch= байгаа бол шууд player,
     эс үгүй бол суваг сонгох grid. Desktop-д үргэлж player + sidebar 2-уулаа. */
  const [mobileShowPlayer, setMobileShowPlayer] = useState<boolean>(!!initialSlug);

  /* Viewport detect — LivePlayer-ийг mobile grid mode үед бүрэн unmount хийхэд
     ашиглана (CSS hidden ашиглавал HLS auto-play хэвээр audio тоглодог). */
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const active = channels.find((c) => c.slug === activeSlug) ?? channels[0];
  const streamUrl = active?.streamUrl ?? null;

  const [channelsLoaded, setChannelsLoaded] = useState(false);
  useEffect(() => {
    api.get<{ success: true; data: { channels: Channel[] } }>("/api/channels")
      .then((r) => {
        const list = (r.data.data?.channels ?? []).filter((c) => c.kind !== "LIVE");
        setChannels(list);
        if (!initialSlug && list.length > 0) setActiveSlug(list[0].slug);
        if (process.env.NODE_ENV === "development") {
          console.log("[tv page] TV/RADIO channels:", list.length);
        }
      })
      .catch((e) => {
        if (process.env.NODE_ENV === "development") console.error("[tv page] channels error:", e);
      })
      .finally(() => setChannelsLoaded(true));
  }, [initialSlug]);

  useEffect(() => {
    api.get<{ success: true; data: { channels: EpgChannel[] } }>("/api/channels/epg")
      .then((r) => setEpgChannels(r.data.data.channels))
      .catch(() => {})
      .finally(() => setEpgLoading(false));
  }, []);

  /* Live-TV access — шинэ загварт нэвтэрсэн бүхэнд free */
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

  /* Дараах хөтөлбөр — header-ийн "Дараагийн" badge-д ашиглагдаагүй ч memo үлдээв */
  useMemo(() => {
    const upcoming = (activeEpg?.programs ?? []).filter((p) => new Date(p.startTime) > now);
    return upcoming.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0];
  }, [activeEpg, now.getTime()]);

  function selectChannel(slug: string) {
    setActiveSlug(slug);
    setMobileShowPlayer(true);
    router.replace(`/tv?ch=${slug}`, { scroll: false });
  }

  function backToGrid() { setMobileShowPlayer(false); }

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

  /* Loading / empty state */
  if (!channelsLoaded || channels.length === 0 || !active) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 pt-[calc(var(--header-h)+16px)] pb-12 space-y-5">
        {!channelsLoaded ? (
          <>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          </>
        ) : (
          <div className="aspect-video rounded-2xl border border-app bg-card flex items-center justify-center text-center px-6">
            <div className="space-y-2">
              <p className="text-app font-semibold">
                {lang === "mn" ? "TV суваг байхгүй" : "No TV channels"}
              </p>
              <p className="text-sm text-muted">
                {lang === "mn" ? "Админ суваг нэмэхэд энд харагдана." : "Channels added by admin will appear here."}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeLogo = active.thumbnailUrl || FALLBACK_LOGO;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 pt-[calc(var(--header-h)+16px)] pb-12 space-y-5">

      {!mobileShowPlayer && (
        <MobileChannelList
          channels={channels}
          epgChannels={epgChannels}
          activeSlug={activeSlug}
          onSelect={selectChannel}
          fmtTime={fmtTime}
        />
      )}

      {/* PLAYER + sidebar — desktop үргэлж, mobile зөвхөн суваг сонгосон үед.
          Conditional render — CSS hidden ашиглавал HLS auto-play хэвээр audio
          тоглодог тул mobile grid mode үед LivePlayer-ийг бүрэн unmount хийнэ. */}
      {(isDesktop || mobileShowPlayer) && (
        <section className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-0">
            <button onClick={backToGrid}
              className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-semibold text-sub hover:text-app transition-colors mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              {lang === "mn" ? "Бүх суваг" : "All channels"}
            </button>

            {canPlay === null ? (
              <Skeleton className="aspect-video w-full rounded-xl" />
            ) : canPlay && streamUrl ? (
              <LivePlayer
                streamUrl={streamUrl}
                channelName={active.name}
                channelLogo={activeLogo}
                poster={active.thumbnailUrl ?? undefined}
                programTitle={currentProgram?.title}
                programLabel={currentProgram
                  ? `${fmtTime(currentProgram.startTime)} – ${fmtTime(currentProgram.endTime)}`
                  : undefined}
                programProgress={currentProgram ? progressPct(currentProgram) : undefined}
                programStartTime={currentProgram?.startTime}
                programEndTime={currentProgram?.endTime}
              />
            ) : (
              <UpgradePrompt kind="live-tv" backdrop={active.thumbnailUrl ?? undefined} />
            )}
          </div>

          <ChannelSidebar
            channels={channels}
            epgChannels={epgChannels}
            activeSlug={activeSlug}
            lang={lang}
            onSelect={selectChannel}
          />
        </section>
      )}

      {/* TABS: Өнөөдрийн хөтөлбөр / EPG (mobile-д grid view үед нуугдана) */}
      <section className={cn(!mobileShowPlayer && "hidden lg:block")}>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex bg-card p-1 rounded-xl border border-app gap-1">
            {(["today", "epg"] as Tab[]).map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  tab === tb ? "bg-brand text-white shadow-card" : "text-sub hover:text-app",
                )}>
                {tb === "today"
                  ? (lang === "mn" ? "Өнөөдрийн хөтөлбөр" : "Today's schedule")
                  : (lang === "mn" ? "7 өдрийн EPG"      : "7-day EPG")}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted hidden md:block">{active.name}</p>
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
            <EPGGrid channels={epgChannels} activeChannelSlug={activeSlug ?? undefined} onChannelSelect={selectChannel} />
          )
        )}
      </section>
    </div>
  );
}

export default function TvPage() {
  return <Suspense><TvContent /></Suspense>;
}
