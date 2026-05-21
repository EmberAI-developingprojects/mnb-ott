"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface LivePlayerProps {
  streamUrl: string;
  channelName: string;
  poster?: string;
}

type Quality = { height: number; bitrate: number; index: number };

export function LivePlayer({ streamUrl, channelName, poster }: LivePlayerProps) {
  const { user } = useAuthStore();
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
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
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
        video.play().catch(() => setIsMuted(true));
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError("Stream ачаалахад алдаа гарлаа");
          setLoading(false);
        }
      });

      return () => { hls.destroy(); };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => setLoading(false));
    }
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CF1E28" strokeWidth="1.5">
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
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-white text-sm font-semibold">{channelName}</span>
            <span className="text-xs bg-danger/80 text-white px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>

          {/* Quality selector */}
          {qualities.length > 0 && (
            <select
              value={currentQuality}
              onChange={(e) => changeQuality(Number(e.target.value))}
              className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none"
            >
              <option value={-1}>AUTO</option>
              {qualities.map((q) => (
                <option key={q.index} value={q.index}>
                  {q.height}p
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
              {isMuted || volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-20 accent-primary"
            />
          </div>

          <div className="flex-1" />

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
            {isFullscreen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
