"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { LivePlayer } from "@/components/player/LivePlayer";
import { EPGGrid } from "@/components/channel/EPGGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { useT } from "@/store/settingsStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

interface EpgProgram {
  id: string; title: string; startTime: string; endTime: string; category?: string;
}
interface EpgChannel { id: string; name: string; slug: string; programs: EpgProgram[]; }

const TEST_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const CHANNELS: (Channel & { isRadio?: boolean; logo: string })[] = [
  { id: "ch1", name: "МНБ 1",        slug: "mnb1",         orderIndex: 1, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    isRadio: false },
  { id: "ch2", name: "МНБ News",      slug: "mnb-news",     orderIndex: 2, isActive: true, streamUrl: "", thumbnailUrl: "/mnews.png",     logo: "/mnews.png",    isRadio: false },
  { id: "ch3", name: "МНБ Sport",     slug: "mnb-sport",    orderIndex: 3, isActive: true, streamUrl: "", thumbnailUrl: "/mnbsport.jpg",  logo: "/mnbsport.jpg", isRadio: false },
  { id: "ch4", name: "МНБ Family",    slug: "mnb-family",   orderIndex: 4, isActive: true, streamUrl: "", thumbnailUrl: "/mnbfamily.png", logo: "/mnbfamily.png",isRadio: false },
  { id: "ch5", name: "МНБ World",     slug: "mnb-world",    orderIndex: 5, isActive: true, streamUrl: "", thumbnailUrl: "/mnbworld.jpg",  logo: "/mnbworld.jpg", isRadio: false },
  { id: "ch6", name: "МНБ Радио",     slug: "mnb-radio",    orderIndex: 6, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    isRadio: true  },
  { id: "ch7", name: "Bluesky Radio", slug: "bluesky-radio",orderIndex: 7, isActive: true, streamUrl: "", thumbnailUrl: "/mnbtv.png",    logo: "/mnbtv.png",    isRadio: true  },
];

type Tab = "channels" | "epg";

function TvContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const initialSlug = searchParams.get("ch") ?? CHANNELS[0].slug;
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [epgChannels, setEpgChannels] = useState<EpgChannel[]>([]);
  const [epgLoading, setEpgLoading]   = useState(true);
  const [tab, setTab] = useState<Tab>("channels");

  const active = CHANNELS.find((c) => c.slug === activeSlug) ?? CHANNELS[0];
  const streamUrl = active.streamUrl || TEST_STREAM;
  const isOffline = false;

  useEffect(() => {
    api.get<{ success: true; data: { channels: EpgChannel[] } }>("/api/channels/epg")
      .then((r) => setEpgChannels(r.data.data.channels))
      .catch(() => {})
      .finally(() => setEpgLoading(false));
  }, []);

  const now = new Date();
  const activeEpg = epgChannels.find((c) => c.slug === activeSlug);
  const currentProgram = activeEpg?.programs.find(
    (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now
  );

  function selectChannel(slug: string) {
    setActiveSlug(slug);
    router.replace(`/tv?ch=${slug}`, { scroll: false });
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-5">
      <div className="flex flex-col xl:flex-row gap-6">

        {/* ── Зүүн: Player + info ──────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {isOffline ? (
            <OfflineScreen channel={active} />
          ) : (
            <LivePlayer streamUrl={streamUrl} channelName={active.name} poster={active.thumbnailUrl} />
          )}

          {/* Суваг мэдээлэл */}
          <div className="flex items-center gap-3">
            <div className="relative h-9 aspect-[2/1] rounded-md overflow-hidden bg-black shrink-0">
              <Image src={active.logo} alt={active.name} fill className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-app">{active.name}</h1>
              {currentProgram ? (
                <p className="text-xs text-muted mt-0.5 truncate">{currentProgram.title}</p>
              ) : (
                <p className="text-xs text-muted mt-0.5">
                  {active.isRadio ? "Радио" : t("channels")}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface p-1 rounded-xl w-fit border border-app">
            {(["channels", "epg"] as Tab[]).map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  tab === tb ? "bg-[#0046A5] text-white" : "text-muted hover:text-app")}>
                {tb === "channels" ? t("channels") : t("schedule")}
              </button>
            ))}
          </div>

          {/* Сувгийн grid — LIVE бичиггүй */}
          {tab === "channels" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {CHANNELS.map((ch) => (
                <button key={ch.slug} onClick={() => selectChannel(ch.slug)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left",
                    activeSlug === ch.slug
                      ? "border-[#0046A5]/60 bg-[#0046A5]/10"
                      : "border-app bg-surface hover:border-[#0046A5]/30 hover:bg-[#0046A5]/5"
                  )}>
                  <div className="relative h-7 aspect-[2/1] rounded-sm overflow-hidden bg-black shrink-0">
                    <Image src={ch.logo} alt={ch.name} fill className="object-contain" />
                    {ch.isRadio && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className={cn("flex-1 min-w-0 text-xs font-semibold truncate transition-colors",
                    activeSlug === ch.slug ? "text-[#0046A5]" : "text-app")}>
                    {ch.name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* EPG Grid */}
          {tab === "epg" && (
            epgLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : (
              <EPGGrid channels={epgChannels} activeChannelSlug={activeSlug} onChannelSelect={selectChannel} />
            )
          )}
        </div>

        {/* ── Баруун: Хөтөлбөр ──────────────────────── */}
        <aside className="xl:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-app mb-3">{t("live_schedule")}</h2>
          <div className="surface-base rounded-2xl overflow-hidden">
            {epgLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (
              <ProgramList programs={activeEpg?.programs ?? []} />
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

function OfflineScreen({ channel }: { channel: typeof CHANNELS[0] }) {
  return (
    <div className="aspect-video bg-app rounded-xl flex flex-col items-center justify-center gap-4 border border-app">
      <div className="relative h-12 aspect-[2/1] rounded-xl overflow-hidden opacity-30">
        <Image src={channel.logo} alt={channel.name} fill className="object-contain" />
      </div>
      <p className="text-app font-semibold">{channel.name}</p>
      <p className="text-muted text-sm">Дамжуулалт одоогоор байхгүй байна</p>
    </div>
  );
}

function ProgramList({ programs }: { programs: EpgProgram[] }) {
  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  const today = programs.filter((p) => {
    const s = new Date(p.startTime);
    return s >= todayStart && s <= todayEnd;
  }).slice(0, 14);

  if (today.length === 0) return <p className="p-4 text-sm text-muted">Хөтөлбөр байхгүй</p>;

  return (
    <div>
      {today.map((p) => {
        const start = new Date(p.startTime);
        const end   = new Date(p.endTime);
        const isCurrent = start <= now && end > now;
        const isPast = end <= now;
        const startTime = start.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
        const endTime   = end.toLocaleTimeString("mn-MN",   { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={p.id}
            className={cn(
              "px-4 py-3 border-b border-[var(--border)] transition-colors",
              isCurrent && "bg-[#0046A5]/8 border-l-2 border-l-[#0046A5]",
              isPast && "opacity-45"
            )}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn("text-xs font-bold tabular-nums",
                isCurrent ? "text-[#0046A5]" : "text-muted")}>
                {startTime}
              </span>
              <span className="text-[10px] text-muted">–</span>
              <span className="text-[10px] text-muted tabular-nums">{endTime}</span>
              {isCurrent && (
                <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold text-white bg-[#CF1E28] px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className={cn("text-sm leading-snug",
              isCurrent ? "text-app font-semibold" : "text-sub")}>
              {p.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function TvPage() {
  return <Suspense><TvContent /></Suspense>;
}
