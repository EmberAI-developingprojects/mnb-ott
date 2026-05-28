"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, formatDuration } from "@/lib/utils";

/* Player controls bar — progress bar (hover preview + seek), play/pause
   (desktop only), time, volume, quality select, fullscreen. Mobile дээр
   play/pause-ийг зөвхөн голын товч + double-tap-аар удирдана. */
export function VodPlayerControls({
  current, total, playing, muted, volume, fullscreen, qualities, thumbnailUrl,
  onTogglePlay, onToggleMute, onVolumeChange, onSeek, onQuality, onToggleFullscreen,
}: {
  current:    number;
  total:      number;
  playing:    boolean;
  muted:      boolean;
  volume:     number;
  fullscreen: boolean;
  qualities:  string[];
  thumbnailUrl: string;
  onTogglePlay:       () => void;
  onToggleMute:       () => void;
  onVolumeChange:     (v: number) => void;
  onSeek:             (sec: number) => void;
  onQuality:          (q: string) => void;
  onToggleFullscreen: () => void;
}) {
  const [seekHover, setSeekHover] = useState<number | null>(null);
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <>
      {/* Progress bar + YouTube-style hover preview (thumbnail + цаг) */}
      <div className="mb-3 group/seek">
        <div role="slider"
          aria-label="Тоглуулах байрлал"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.floor(total))}
          aria-valuenow={Math.floor(current)}
          tabIndex={0}
          className="relative h-1 group-hover/seek:h-1.5 transition-all rounded-full bg-white/20 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * total);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setSeekHover(ratio);
          }}
          onMouseLeave={() => setSeekHover(null)}
        >
          {/* Hover prefix — YouTube саарал гүйлгэх hint */}
          {seekHover !== null && (
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${seekHover * 100}%` }} />
          )}
          <div className="h-full bg-primary rounded-full pointer-events-none" style={{ width: `${progress}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow
            opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
          />

          {/* Hover tooltip — thumbnail + цаг */}
          {seekHover !== null && total > 0 && (
            <div className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none flex flex-col items-center"
              style={{ left: `${seekHover * 100}%` }}>
              <div className="relative w-40 aspect-video rounded-md overflow-hidden bg-black ring-1 ring-white/20 shadow-xl mb-1.5">
                <Image src={thumbnailUrl} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <span className="px-1.5 py-0.5 rounded bg-black/85 text-white text-[11px] font-mono tabular-nums">
                {formatDuration(Math.floor(seekHover * total))}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Play/Pause — зөвхөн desktop (lg+). Mobile-д голын товч ажиллана. */}
        <button onClick={onTogglePlay} aria-label={playing ? "Зогсоох" : "Тоглуулах"}
          className="hidden lg:block text-white hover:text-primary transition-colors shrink-0">
          {playing ? (
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Time */}
        <span className="text-white/70 text-xs font-mono tabular-nums shrink-0">
          {formatDuration(Math.floor(current))}
          {total > 0 && ` / ${formatDuration(Math.floor(total))}`}
        </span>

        {/* Volume */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onToggleMute} aria-label={muted || volume === 0 ? "Дуу нээх" : "Дуугүй болгох"}
            className="text-white hover:text-primary transition-colors">
            {muted || volume === 0 ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
          </button>
          <input
            type="range" min={0} max={100} step={1} value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Дууны түвшин"
            className="w-20 accent-primary cursor-pointer"
          />
        </div>

        <div className="flex-1" />

        {/* Quality */}
        {qualities.length > 1 && (
          <select
            onChange={(e) => onQuality(e.target.value)}
            aria-label="Чанар сонгох"
            className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {qualities.map((q) => (
              <option key={q} value={q}>
                {q === "auto" ? "AUTO" : q.replace("hd", "").replace("large", "480").replace("medium", "360").replace("small", "240")}p
              </option>
            ))}
          </select>
        )}

        {/* Fullscreen */}
        <button onClick={onToggleFullscreen} aria-label={fullscreen ? "Дэлгэцээс гарах" : "Бүтэн дэлгэц"}
          className="text-white hover:text-primary transition-colors shrink-0">
          {fullscreen ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

/* Poster overlay — player эхлээгүй үед thumbnail + play товч.
   Нэвтрээгүй үед login redirect товчтой. */
export function VodPlayerPoster({
  title, thumbnailUrl, duration, isLoggedIn, loginLabel, onStart,
}: {
  title:        string;
  thumbnailUrl: string;
  duration?:    number;
  isLoggedIn:   boolean;
  loginLabel:   string;
  onStart:      () => void;
}) {
  return (
    <div className="absolute inset-0 z-10">
      <Image src={thumbnailUrl} alt={title} fill sizes="100vw"
        className="object-cover" priority />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        {isLoggedIn ? (
          <button onClick={onStart} aria-label="Тоглуулах"
            className="w-20 h-20 rounded-full bg-accent/90 hover:bg-accent flex items-center justify-center
              shadow-2xl transition-transform hover:scale-110">
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <button onClick={onStart} aria-label={loginLabel} className="flex flex-col items-center gap-2 group">
            <div className={cn(
              "w-20 h-20 rounded-full bg-black/60 border-2 border-white/20",
              "flex items-center justify-center group-hover:border-accent transition-colors",
            )}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <span className="text-white/80 text-sm font-semibold bg-accent px-4 py-1.5 rounded-full">
              {loginLabel}
            </span>
          </button>
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <p className="text-white font-semibold text-sm line-clamp-1">{title}</p>
        {duration != null && (
          <p className="text-white/60 text-xs mt-0.5">{formatDuration(duration)}</p>
        )}
      </div>
    </div>
  );
}

/* "End-screen" — видео дууссан үед "Дахин үзэх" товч. */
export function ReplayButton({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}>
      <button onClick={onReplay} aria-label="Дахин үзэх"
        className="w-16 h-16 rounded-full bg-[var(--primary)]/90 hover:bg-[var(--primary)] flex items-center justify-center transition-all">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
      </button>
    </div>
  );
}
