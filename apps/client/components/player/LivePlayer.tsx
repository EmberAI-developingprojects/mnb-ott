"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";

interface LivePlayerProps {
  streamUrl:        string;
  channelName:      string;
  channelLogo?:     string;  /* Player-ийн дотор top bar-д харагдах logo */
  poster?:          string;
  /* Одоо гарч буй хөтөлбөрийн прогресс (0–100). Player-ийн доод хэсэгт
     YouTube-маяг seek bar болж overlay харагдана. DVR seek хийгдээгүй
     тул одоохондоо зөвхөн visual indicator. */
  programProgress?: number;
  programLabel?:    string;  /* "08:30 – 09:30" гэх мэт */
  programTitle?:    string;
  /* YouTube-маяг hover tooltip-д ашиглах: hover position-аас цаг тооцоологдоно.
     Both ISO string-аар хүлээж авна. */
  programStartTime?: string;
  programEndTime?:   string;
}

type Quality = { height: number; bitrate: number; index: number };

export function LivePlayer({
  streamUrl, channelName, channelLogo, poster,
  programProgress, programLabel, programTitle,
  programStartTime, programEndTime,
}: LivePlayerProps) {
  const { user } = useAuthStore();
  const t = useT();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  /* YouTube-style seek bar hover state — 0..1 ratio of bar width, эсвэл null */
  const [seekHover, setSeekHover] = useState<number | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return; // Zustand hydrate хүлээнэ
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setError("");
    setLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker:     true,
        lowLatencyMode:   false,            /* Чанарыг сонгож, latency төлөх */
        backBufferLength: 60,               /* 1 минут ухаарах боломж */

        /* Live experience — том буфер + урт хоцролт = stable HD */
        liveSyncDuration:       20,         /* Live edge-аас 20 сек хойш */
        liveMaxLatencyDuration: 60,         /* 60 сек хоцортол ухтуулахгүй */
        maxBufferLength:       120,         /* Forward buffer 2 минут */
        maxMaxBufferLength:    300,         /* Memory cap 5 минут */
        maxBufferSize:    120 * 1000 * 1000,/* 120MB buffer (HD stream-д хангалттай) */
        maxBufferHole:        0.5,          /* 0.5 сек жижиг gap-аас seek-гүй үргэлжлэх */
        highBufferWatchdogPeriod: 3,        /* Buffer 3 сек тутамд шалгана */

        /* ABR — quality-руу хэлбэйх (multi-bitrate байх үед) */
        startLevel:             -1,         /* Auto + доорх factor-аар */
        capLevelToPlayerSize:  false,       /* Player жижиг ч максимум чанар */
        capLevelOnFPSDrop:     false,       /* FPS унавал чанар бууруулахгүй */
        abrBandWidthFactor:     0.75,       /* 75% bandwidth л — safety 25% */
        abrBandWidthUpFactor:   0.3,        /* Quality дээш аажуу шилжих */
        abrMaxWithRealBitrate: true,
        testBandwidth:         true,        /* Эхэнд network тест */
        abrEwmaFastLive:       3.0,         /* Bandwidth дундаж аажуу (stable) */
        abrEwmaSlowLive:       9.0,         /* Long-term дундаж урт цаг */
        abrEwmaDefaultEstimate: 1500000,    /* 1.5Mbps default (HD-руу хэлбэйх) */
        maxStarvationDelay:    20,          /* Buffer хоосон бол 20 сек хүлээж downgrade */

        /* Network resilience — ачаалал ихтэй origin-д */
        fragLoadingTimeOut:     30000,      /* 30 сек timeout (өмнө 20) */
        fragLoadingMaxRetry:        8,      /* 8 удаа retry (өмнө 6) */
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry:    4,
        levelLoadingTimeOut:    15000,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLoading(false);
        const qs: Quality[] = data.levels.map((l, i) => ({
          height: l.height,
          bitrate: l.bitrate,
          index: i,
        }));
        setQualities(qs);
        /* Autoplay-ийн орчин үеийн browser policy:
             - Muted video: autoplay зөвшөөрнө
             - Unmuted video: хэрэглэгчийн interaction шаардана
           Хэрэв play() reject хийвэл (autoplay блоклогдсон), бид өөрсдөө
           video-г mute хийгээд retry хийнэ. Өмнө зөвхөн React state-ийг
           setIsMuted(true) хийдэг байсан — video.muted шинэчлэгдэхгүй
           учраас UI muted icon харуулж байж, видео хэсэг хугацааны дараа
           ДУУТАЙ тоглодог desync асуудал гардаг байсан. */
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => { /* still blocked, give up */ });
        });
      });

      /* Video element-ийн mute төлвийг React state-тэй ямагт sync байлгана.
         Browser-аас (keyboard shortcut, system mute гэх мэт)-аар mute солигдсон
         ч UI зөв харагдана. */
      const onVolumeChange = () => setIsMuted(video.muted);
      video.addEventListener("volumechange", onVolumeChange);

      /* Auto-recovery — fatal алдааг шууд recover хийх оролдоно */
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            /* Network glitch — manifest дахин ачаална */
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            /* Decoder problem — media recovery */
            hls.recoverMediaError();
            break;
          default:
            /* Recoverable биш — UI-д алдаа харуулна */
            setError(t("stream_load_failed"));
            setLoading(false);
        }
      });

      return () => {
        video.removeEventListener("volumechange", onVolumeChange);
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => setLoading(false));
      /* Safari дээр ч ижил sync хадгална */
      const onVolumeChange = () => setIsMuted(video.muted);
      video.addEventListener("volumechange", onVolumeChange);
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => { /* still blocked */ });
      });
      return () => video.removeEventListener("volumechange", onVolumeChange);
    }
    /* t (translate) нь stream init-д шаардлагагүй — error мессежид л ашиглана,
       dep-д оруулбал хэл солих бүрд HLS дахин init болно. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [streamUrl, mounted, user, router]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }

  function changeVolume(val: number) {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  }

  function changeQuality(index: number) {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = index;
    setCurrentQuality(index);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  function handleMouseMove() {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  if (error) {
    return (
      <div className="aspect-video bg-dark-bg rounded-xl flex flex-col items-center justify-center gap-3">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DA2031" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-muted text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top bar — logo + суваг + хөтөлбөр + LIVE badge */}
        <div className="flex items-center mb-3 gap-2.5 min-w-0">
          {channelLogo && (
            <div className="relative h-7 w-11 rounded overflow-hidden bg-black/40 shrink-0">
              <Image src={channelLogo} alt={channelName} fill sizes="44px" className="object-contain p-0.5" />
            </div>
          )}
          <span className="text-white text-sm font-semibold shrink-0">{channelName}</span>
          {programTitle && (
            <span className="text-white/70 text-xs truncate hidden sm:inline">· {programTitle}</span>
          )}
          <span className="text-[10px] bg-danger text-white px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0">LIVE</span>
        </div>

        {/* Program progress seek bar — hover үед YouTube-style preview + цаг */}
        {typeof programProgress === "number" && (
          <div className="mb-3 flex items-center gap-3">
            <div
              ref={seekBarRef}
              className="relative flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer group/seek"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setSeekHover(ratio);
              }}
              onMouseLeave={() => setSeekHover(null)}
            >
              {/* Hover progress (gray prefix дээр) */}
              {seekHover !== null && (
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full pointer-events-none"
                  style={{ width: `${seekHover * 100}%` }} />
              )}
              {/* Played progress */}
              <div className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all pointer-events-none"
                style={{ width: `${programProgress}%` }} />
              {/* Played knob */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md ring-1 ring-black/20 transition-all pointer-events-none"
                style={{ left: `${programProgress}%` }} />

              {/* Hover preview — миниатюр + цаг (зөвхөн hover үед) */}
              {seekHover !== null && programStartTime && programEndTime && (() => {
                const start = new Date(programStartTime).getTime();
                const end   = new Date(programEndTime).getTime();
                const t = new Date(start + (end - start) * seekHover);
                const hh = String(t.getHours()).padStart(2, "0");
                const mm = String(t.getMinutes()).padStart(2, "0");
                return (
                  <div className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none flex flex-col items-center"
                    style={{ left: `${seekHover * 100}%` }}>
                    {poster && (
                      <div className="relative w-40 aspect-video rounded-md overflow-hidden bg-black ring-1 ring-white/20 shadow-xl mb-1.5">
                        <Image src={poster} alt="" fill sizes="160px" className="object-cover" />
                      </div>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-black/85 text-white text-[11px] font-mono tabular-nums">
                      {hh}:{mm}
                    </span>
                  </div>
                );
              })()}
            </div>
            {programLabel && (
              <span className="text-white/80 text-[11px] font-mono tabular-nums shrink-0">{programLabel}</span>
            )}
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} aria-label={isPlaying ? "Зогсоох" : "Тоглуулах"}
            className="text-white hover:text-primary transition-colors">
            {isPlaying ? (
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? "Дуу нээх" : "Дуугүй болгох"}
              className="text-white hover:text-primary transition-colors">
              {isMuted || volume === 0 ? (
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Дууны түвшин"
              className="w-20 accent-primary"
            />
          </div>

          <div className="flex-1" />

          {/* Quality selector — fullscreen товчны зүүн талд */}
          {qualities.length > 0 && (
            <select
              value={currentQuality}
              onChange={(e) => changeQuality(Number(e.target.value))}
              aria-label="Чанар сонгох"
              className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none hover:bg-black/80 transition-colors cursor-pointer"
            >
              <option value={-1}>AUTO</option>
              {qualities.map((q) => (
                <option key={q.index} value={q.index}>
                  {q.height}p
                </option>
              ))}
            </select>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Дэлгэцээс гарах" : "Бүтэн дэлгэц"}
            className="text-white hover:text-primary transition-colors">
            {isFullscreen ? (
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
