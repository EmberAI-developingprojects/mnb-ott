"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LivePlayer } from "@/components/player/LivePlayer";
import { useT } from "@/store/settingsStore";
import api from "@/lib/api";

interface EpgProgram {
  id: string; title: string; startTime: string; endTime: string;
}

const LIVE_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const LIVE_LOGO   = "/mnbtv.png";
const LIVE_NAME   = "МНБ 1";

export default function LivePage() {
  const t = useT();
  const [programs, setPrograms] = useState<EpgProgram[]>([]);

  useEffect(() => {
    api.get<{ success: true; data: { channels: { slug: string; programs: EpgProgram[] }[] } }>("/api/channels/epg")
      .then((r) => {
        const ch = r.data.data.channels.find((c) => c.slug === "mnb1");
        if (ch) setPrograms(ch.programs);
      })
      .catch(() => {});
  }, []);

  const now = new Date();
  const current = programs.find(
    (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now
  );
  const next = programs.find((p) => new Date(p.startTime) > now);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-5">

      {/* Player */}
      <LivePlayer streamUrl={LIVE_STREAM} channelName={LIVE_NAME} poster="/mnbtv.png" />

      {/* Суваг мэдээлэл */}
      <div className="flex items-center gap-4">
        <div className="relative h-10 aspect-[2/1] rounded-md overflow-hidden bg-black shrink-0">
          <Image src={LIVE_LOGO} alt={LIVE_NAME} fill className="object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-app">{LIVE_NAME}</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white
              bg-[#CF1E28] px-2 py-0.5 rounded-full">
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
                      ${isCurrent ? "bg-[#0046A5]/8 border-l-2 border-l-[#0046A5]" : ""}
                      ${isPast ? "opacity-45" : ""}`}>
                    <div className="shrink-0 w-20">
                      <span className={`text-xs font-bold tabular-nums ${isCurrent ? "text-[#0046A5]" : "text-muted"}`}>
                        {startTime}
                      </span>
                      <span className="text-[10px] text-muted block">– {endTime}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-[#CF1E28] px-1.5 py-0.5 rounded-full shrink-0">
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
