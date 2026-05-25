"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn, formatDuration } from "@/lib/utils";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";

// ── YouTube IFrame API типүүд ─────────────────────────

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  const PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
  class Player {
    constructor(el: string | HTMLElement, opts: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(sec: number, allow: boolean): void;
    setVolume(v: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getVolume(): number;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    getAvailableQualityLevels(): string[];
    setPlaybackQuality(q: string): void;
    destroy(): void;
  }
  interface PlayerOptions {
    videoId: string;
    width?: string;
    height?: string;
    host?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (e: { target: Player }) => void;
      onStateChange?: (e: { data: number; target: Player }) => void;
      onError?: (e: { data: number }) => void;
    };
  }
}

// ── Utility ───────────────────────────────────────────

function loadYTScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

// ── Main component ────────────────────────────────────

interface VodPlayerProps {
  youtubeId: string;
  vodId: string;
  title: string;
  thumbnailUrl: string;
  duration?: number;
  startPosition?: number;
}

export function VodPlayer({
  youtubeId, vodId, title, thumbnailUrl, duration, startPosition = 0,
}: VodPlayerProps) {
  const { user } = useAuthStore();
  const t = useT();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [current, setCurrent] = useState(startPosition);
  const [total, setTotal] = useState(duration ?? 0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [qualities, setQualities] = useState<string[]>([]);
  /* Seek bar hover (0..1 ratio of width) — YouTube-style time + thumbnail tooltip */
  const [seekHover, setSeekHover] = useState<number | null>(null);

  // Явцыг хадгалах — 3 секундын дебоунс. Хэрэглэгчид саадгүй болохын тулд
  // алдааг toast-аар бус, dev console-руу л бичнэ. Олон тооны fail тохиолдвол
  // Sentry/analytics-руу хожим илгээнэ.
  const saveProgress = useCallback(async (sec: number) => {
    if (!user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.post(`/api/vod/${vodId}/progress`, { positionSec: Math.floor(sec) });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[VodPlayer] saveProgress failed", err);
        }
      }
    }, 3000);
  }, [user, vodId]);

  // Player initialize
  const initPlayer = useCallback(async () => {
    // Нэвтрээгүй бол login хуудас руу redirect
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setStarted(true);
    await loadYTScript();
    const el = document.getElementById(`yt-${youtubeId}`);
    if (!el) return;

    playerRef.current = new window.YT.Player(el, {
      videoId: youtubeId,
      width: "100%",
      height: "100%",
      host: "https://www.youtube-nocookie.com",  // privacy-enhanced — branding багасна
      playerVars: {
        autoplay: 1,
        controls: 0,          // YouTube controls бүрэн нуух
        rel: 0,               // санал болгох видео нуух (rel ажиллахгүй болсон — overlay-д найдна)
        modestbranding: 1,    // YouTube лого хамгийн бага
        iv_load_policy: 3,    // annotation, card нуух
        disablekb: 1,         // YouTube keyboard shortcuts унтраах
        fs: 0,                // YouTube-ийн өөрийн fullscreen товч нуух
        cc_load_policy: 0,    // subtitle автоматаар нуух
        showinfo: 0,          // дээд талын мэдэлэл нуух
        playsinline: 1,
        start: startPosition,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: ({ target }) => {
          setReady(true);
          setTotal(target.getDuration());
          const qs = target.getAvailableQualityLevels();
          setQualities(qs);
          target.setVolume(volume);
        },
        onStateChange: ({ data }) => {
          const PLAYING = 1, ENDED = 0;
          setPlaying(data === PLAYING);
          setEnded(data === ENDED);
          if (data === PLAYING) {
            progressTimer.current = setInterval(() => {
              const t = playerRef.current?.getCurrentTime() ?? 0;
              setCurrent(t);
              saveProgress(t);
            }, 1000);
          } else {
            clearInterval(progressTimer.current);
          }
          if (data === ENDED) setCurrent(total);
        },
      },
    });
  }, [youtubeId, startPosition, volume, saveProgress, total]);

  useEffect(() => {
    return () => {
      clearInterval(progressTimer.current);
      clearTimeout(saveTimer.current);
      clearTimeout(hideTimer.current);
      playerRef.current?.destroy();
    };
  }, []);

  // Controls харуулах
  function revealControls() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }

  function togglePlay() {
    if (!playerRef.current) return;
    playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) { playerRef.current.unMute(); setMuted(false); }
    else { playerRef.current.mute(); setMuted(true); }
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    setMuted(v === 0);
    if (!playerRef.current) return;
    playerRef.current.setVolume(v);
    if (v === 0) playerRef.current.mute(); else playerRef.current.unMute();
  }

  function handleSeek(sec: number) {
    setCurrent(sec);
    playerRef.current?.seekTo(sec, true);
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }

  function setQuality(q: string) {
    playerRef.current?.setPlaybackQuality(q);
  }

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden select-none"
    >
      {/* Poster — player эхлээгүй үед */}
      {!started && (
        <div className="absolute inset-0 z-10">
          <Image src={thumbnailUrl} alt={title} fill sizes="100vw"
            className="object-cover" priority />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {user ? (
              <button
                onClick={initPlayer}
                className="w-20 h-20 rounded-full bg-accent/90 hover:bg-accent flex items-center justify-center
                  shadow-2xl transition-transform hover:scale-110"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            ) : (
              /* Нэвтрээгүй хэрэглэгчид login товч харуулна */
              <button
                onClick={initPlayer}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-20 h-20 rounded-full bg-black/60 border-2 border-white/20 flex items-center justify-center
                  group-hover:border-accent transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-semibold bg-accent px-4 py-1.5 rounded-full">
                  {t("login")}
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
      )}

      {/* YouTube iframe — pointer-events: none → YouTube hover event-ийг авахгүй
          → playback үед YouTube controls bar, watermark, "More videos" гарахгүй.
          Бүх mouse interaction-ийг доорх z-22 overlay шийднэ.
          Inline style нь YT.Player iframe-ээр солихоос ч хойш хүчинтэй (inherit). */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      >
        <div
          id={`yt-${youtubeId}`}
          className="w-full h-full"
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* Loading */}
      {started && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="w-12 h-12 border-[3px] border-white/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/*
        BLOCKER + CONTROLS
        ─────────────────────────────────────────────────────────────────
        Pause болон End үед: бүтэн overlay (bg-black/60) → YouTube-ийн
          "More videos", watermark, pause animation бүрэн нуугдана.
        Play үед controls харагдахгүй бол: цэвэр тунгалаг → видео бүрэн харагдана.
        Play үед controls харагдах бол: зөвхөн доод gradient.
        Cover div огт хэрэггүй — энэ нэг overlay бүгдийг шийднэ.
      */}
      {started && ready && (
        <div
          className="absolute inset-0 z-[22] cursor-pointer"
          onClick={togglePlay}
          onMouseMove={revealControls}
          onMouseLeave={() => playing && setShowControls(false)}
        >
          {/* End-screen: дууссан үед "Дахин үзэх" товч */}
          {ended && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); }}>
              <button
                onClick={() => { playerRef.current?.seekTo(0, true); playerRef.current?.playVideo(); setEnded(false); }}
                className="w-16 h-16 rounded-full bg-[var(--primary)]/90 hover:bg-[var(--primary)] flex items-center justify-center transition-all">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>
            </div>
          )}
          {/* Controls UI — pause үед үргэлж харагдана, play үед fade */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 transition-opacity duration-300 bg-gradient-to-t from-black/90 via-black/30 to-transparent pt-16 pb-3 px-4",
              !playing || showControls ? "opacity-100" : "opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar + YouTube-style hover preview (thumbnail + цаг) */}
            <div className="mb-3 group/seek">
              <div className="relative h-1 group-hover/seek:h-1.5 transition-all rounded-full bg-white/20 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSeek(((e.clientX - rect.left) / rect.width) * total);
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setSeekHover(ratio);
                }}
                onMouseLeave={() => setSeekHover(null)}
              >
                {/* Hover prefix (YouTube саарал гүйлгэх hint) */}
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
              {/* Play/Pause */}
              <button onClick={togglePlay} className="text-white hover:text-primary transition-colors shrink-0">
                {playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
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
                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                  {muted || volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range" min={0} max={100} step={1} value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex-1" />

              {/* Quality */}
              {qualities.length > 1 && (
                <select
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {qualities.map((q) => (
                    <option key={q} value={q}>{q === "auto" ? "AUTO" : q.replace("hd", "").replace("large", "480").replace("medium", "360").replace("small", "240")}p</option>
                  ))}
                </select>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors shrink-0">
                {fullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

