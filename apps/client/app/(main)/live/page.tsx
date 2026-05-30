"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { UpgradePrompt } from "@/components/layout/UpgradePrompt";

/* hls.js-ийг initial bundle-аас гаргах — dynamic lazy load */
const LivePlayer = dynamic(
  () => import("@/components/player/LivePlayer").then((m) => m.LivePlayer),
  { ssr: false },
);
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { cachedGet } from "@/lib/api";

interface EpgProgram {
  id: string; title: string; startTime: string; endTime: string;
}

interface LiveChannel {
  id: string;
  name: string;
  slug: string;
  kind: "LIVE" | "TV" | "RADIO";
  thumbnailUrl: string | null;
  streamUrl: string | null;
  price?: number | null;
  endsAt?: string | null;
}

/* Backend LIVE-төрлийн суваг олдохгүй үед ашиглах placeholder зураг */
const FALLBACK_LOGO = "/mnbtv.png";

export default function LivePage() {
  const t = useT();
  const { user } = useAuthStore();
  const [live, setLive] = useState<LiveChannel | null>(null);
  const [programs, setPrograms] = useState<EpgProgram[]>([]);
  const [canPlay, setCanPlay]   = useState<boolean | null>(null);

  /* LIVE event сувгийг авна (admin-аас үүсгэсэн PPV event).
     LIVE event байхгүй бол fallback: эхний TV channel (хуучин үндсэн live broadcast).
     Хоёулаа хоосон бол `live` нь null хэвээр → empty state. */
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    cachedGet<{ success: true; data: { tv: LiveChannel[]; live: LiveChannel[] } }>("/api/channels")
      .then((r) => {
        const liveEvents = r.data.data?.live ?? [];
        const tvChannels = r.data.data?.tv   ?? [];
        /* Нүүрний LiveEventBanner-тэй ИЖИЛ шүүлт: дууссан event-ийг алгасна
           (endsAt > now эсвэл endsAt байхгүй). Эс бөгөөс /live дээр дууссан
           event гарч, banner-тэй зөрүүтэй болдог. */
        const now = Date.now();
        const activeEvents = liveEvents.filter(
          (e) => !e.endsAt || new Date(e.endsAt).getTime() > now,
        );
        const liveCh = activeEvents[0] ?? tvChannels[0];
        setLive(liveCh ?? null);
        if (process.env.NODE_ENV === "development") {
          console.log("[live page] live events:", liveEvents.length, "active:", activeEvents.length, "selected:", liveCh?.slug);
        }
      })
      .catch((e) => {
        if (process.env.NODE_ENV === "development") console.error("[live page] channels error:", e);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!live) return;
    cachedGet<{ success: true; data: { channels: { slug: string; programs: EpgProgram[] }[] } }>("/api/channels/epg", { ttl: 300_000 })
      .then((r) => {
        const ch = r.data.data.channels.find((c) => c.slug === live.slug);
        if (ch) setPrograms(ch.programs);
      })
      .catch(() => {});
  }, [live]);

  /* LIVE event PPV access — channelId-аар Purchase шалгана.
     TV/RADIO нь үнэгүй, харин LIVE event нь тус бүрчлэн худалдан авах ёстой. */
  useEffect(() => {
    if (!user || !live) { setCanPlay(false); return; }
    /* LIVE channel бол PPV, харин TV/RADIO бол free (нэвтэрсэн бол үргэлж pass) */
    if (live.kind !== "LIVE") { setCanPlay(true); return; }
    api.post<{ success: true; data: { allowed: boolean } }>(
      "/api/subscription/access",
      { kind: "live", vodId: live.id },
    ).then((r) => setCanPlay(r.data.data.allowed))
     .catch(() => setCanPlay(false));
    /* user?.id + live?.id/kind л хамаатай — бүтэн объектыг dep-д оруулбал
       reference өөрчлөгдөх бүрд дахин ажиллана. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user?.id, live?.id, live?.kind]);

  /* Minute tick — "одоо/дараагийн" хөтөлбөр автомат шилжүүлэх (timer-гүй бол гацна) */
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = new Date(nowMs);
  const current = programs.find(
    (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now
  );
  const next = programs.find((p) => new Date(p.startTime) > now);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 pt-[calc(var(--header-h)+24px)] pb-12 space-y-5">

      {/* Player */}
      {!loaded || canPlay === null ? (
        <Skeleton className="aspect-video w-full rounded-xl" />
      ) : !live ? (
        /* Channels огт алга — admin/channels-аас үүсгэх ёстой */
        <div className="aspect-video rounded-2xl border border-app bg-card flex items-center justify-center text-center px-6">
          <div className="space-y-2">
            <p className="text-app font-semibold">Шууд цацалт байхгүй</p>
            <p className="text-sm text-muted">Админ дамжуулалт нэмэхэд энд харагдана.</p>
          </div>
        </div>
      ) : canPlay && live.streamUrl ? (
        <LivePlayer streamUrl={live.streamUrl} channelName={live.name} poster={live.thumbnailUrl ?? FALLBACK_LOGO} />
      ) : (
        /* LIVE event-д PPV худалдан авах товч (24 цаг) — `live` kind */
        <UpgradePrompt
          kind="live"
          channelId={live.id}
          price={live.price ?? undefined}
          title={live.name}
          backdrop={live.thumbnailUrl ?? FALLBACK_LOGO}
        />
      )}

      {/* Суваг мэдээлэл */}
      <div className="flex items-center gap-4">
        <div className="relative h-10 aspect-[2/1] rounded-md overflow-hidden bg-black shrink-0">
          <Image src={live?.thumbnailUrl || FALLBACK_LOGO} alt={live?.name ?? ""} fill sizes="80px" className="object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-app">{live?.name ?? "—"}</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white
              bg-[#DA2031] px-2 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
          {current && (
            <p className="text-sm text-muted mt-0.5 truncate">{current.title}</p>
          )}
        </div>
        {next && (
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-[10px] text-muted uppercase tracking-wider">Дараагийн</span>
            <p className="text-xs text-sub font-medium mt-0.5 text-right max-w-[180px] truncate">
              {new Date(next.startTime).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
              {" · "}{next.title}
            </p>
          </div>
        )}
      </div>

      {/* Өнөөдрийн хөтөлбөр */}
      {programs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-app">{t("live_schedule")}</h2>
          <div className="surface-base rounded-2xl overflow-hidden">
            {programs
              .filter((p) => {
                const s = new Date(p.startTime);
                const today = new Date(); today.setHours(0,0,0,0);
                const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
                return s >= today && s <= todayEnd;
              })
              .slice(0, 12)
              .map((p) => {
                const start = new Date(p.startTime);
                const end   = new Date(p.endTime);
                const isCurrent = start <= now && end > now;
                const isPast = end <= now;
                const startTime = start.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
                const endTime   = end.toLocaleTimeString("mn-MN",   { hour: "2-digit", minute: "2-digit" });

                return (
                  <div key={p.id}
                    className={`px-4 py-3 border-b border-[var(--border)] transition-colors flex items-start gap-3
                      ${isCurrent ? "bg-accent/10 border-l-2 border-l-accent" : ""}
                      ${isPast ? "opacity-45" : ""}`}>
                    <div className="shrink-0 w-20">
                      <span className={`text-xs font-bold tabular-nums ${isCurrent ? "text-accent" : "text-muted"}`}>
                        {startTime}
                      </span>
                      <span className="text-[10px] text-muted block">– {endTime}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-[#DA2031] px-1.5 py-0.5 rounded-full shrink-0">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      )}
                      <p className={`text-sm leading-snug ${isCurrent ? "text-app font-semibold" : "text-sub"}`}>
                        {p.title}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
