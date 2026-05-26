"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { loadYTScript, type YT } from "./_vod/yt";
import { VodPlayerControls, VodPlayerPoster, ReplayButton } from "./_vod/VodPlayerControls";

interface VodPlayerProps {
  youtubeId:    string;
  vodId:        string;
  title:        string;
  thumbnailUrl: string;
  duration?:    number;
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
  /* Double-tap seek визуал feedback ба state — YouTube-style */
  const [skipHint, setSkipHint] = useState<"back" | "fwd" | null>(null);
  const lastTapRef = useRef<{ t: number; side: "left" | "right" } | null>(null);
  const skipHintTimer = useRef<ReturnType<typeof setTimeout>>();
  /* Single-tap-ийг 280ms хүлээж дараагийн tap ирвэл double-tap-аар авна.
     Энэ ref нь deferred togglePlay-ийн timer-ийг хадгална. */
  const singleTapTimer = useRef<ReturnType<typeof setTimeout>>();

  /* Явц хадгалах — 3 сек debounce. user + vodId stale closure-аас зайлсхийнэ */
  const userRef  = useRef(user);
  const vodIdRef = useRef(vodId);
  userRef.current  = user;
  vodIdRef.current = vodId;

  const saveProgress = useCallback((sec: number) => {
    if (!userRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.post(`/api/vod/${vodIdRef.current}/progress`, { positionSec: Math.floor(sec) });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[VodPlayer] saveProgress failed", err);
        }
      }
    }, 3000);
  }, []);

  const initPlayer = useCallback(async () => {
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
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        cc_load_policy: 0,
        showinfo: 0,
        playsinline: 1,
        start: startPosition,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: ({ target }) => {
          setReady(true);
          setTotal(target.getDuration());
          setQualities(target.getAvailableQualityLevels());
          target.setVolume(volume);
        },
        onStateChange: ({ data }) => {
          const PLAYING = 1, ENDED = 0;
          setPlaying(data === PLAYING);
          setEnded(data === ENDED);
          if (data === PLAYING) {
            progressTimer.current = setInterval(() => {
              const sec = playerRef.current?.getCurrentTime() ?? 0;
              setCurrent(sec);
              saveProgress(sec);
            }, 1000);
          } else {
            clearInterval(progressTimer.current);
          }
          if (data === ENDED) setCurrent(total);
        },
      },
    });
  }, [youtubeId, startPosition, volume, saveProgress, total, router, user]);

  useEffect(() => {
    return () => {
      clearInterval(progressTimer.current);
      clearTimeout(saveTimer.current);
      clearTimeout(hideTimer.current);
      clearTimeout(skipHintTimer.current);
      clearTimeout(singleTapTimer.current);
      playerRef.current?.destroy();
    };
  }, []);

  /* Keyboard shortcuts — desktop хэрэглэгчдэд YouTube-маяг.
     ← / → : ±10 сек seek + skipHint badge
     Space : play/pause
     m     : mute toggle
     f     : fullscreen toggle
     Input/textarea-д бичиж байгаа үед ажиллахгүй (typing-ийг тасалдуулахгүйн тулд). */
  useEffect(() => {
    if (!started || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const yt = playerRef.current;
      if (!yt) return;

      switch (e.key) {
        case "ArrowLeft": {
          e.preventDefault();
          const next = Math.max(0, yt.getCurrentTime() - 10);
          yt.seekTo(next, true); setCurrent(next);
          setSkipHint("back");
          clearTimeout(skipHintTimer.current);
          skipHintTimer.current = setTimeout(() => setSkipHint(null), 500);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const next = Math.min(total || yt.getDuration(), yt.getCurrentTime() + 10);
          yt.seekTo(next, true); setCurrent(next);
          setSkipHint("fwd");
          clearTimeout(skipHintTimer.current);
          skipHintTimer.current = setTimeout(() => setSkipHint(null), 500);
          break;
        }
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [started, ready, total]);

  function revealControls() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }

  function togglePlay() {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }

  /* YouTube-маяг tap handler — single vs double-tap зөв ялгана:
     - Эхний tap → 280ms хүлээгээд togglePlay (хэрэв 2-р tap ирэхгүй бол)
     - 2-р tap зүүн талд → −10s seek
     - 2-р tap баруун талд → +10s seek
     2-р tap нэгдүгээр-ийн pending toggle-ийг clearTimeout-аар цуцлана,
     тиймээс double-tap-аас togglePlay давхар ажиллахгүй. */
  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
    const now  = Date.now();
    const last = lastTapRef.current;

    if (last && now - last.t < 300) {
      /* Double-tap → pending togglePlay-ийг цуцалж seek хийнэ */
      clearTimeout(singleTapTimer.current);
      const cur  = playerRef.current.getCurrentTime();
      const next = Math.max(0, Math.min(total, cur + (side === "right" ? 10 : -10)));
      playerRef.current.seekTo(next, true);
      setCurrent(next);
      setSkipHint(side === "right" ? "fwd" : "back");
      clearTimeout(skipHintTimer.current);
      skipHintTimer.current = setTimeout(() => setSkipHint(null), 500);
      lastTapRef.current = null;
      return;
    }

    /* Эхний tap — togglePlay-ийг 280ms-аар хойшлуулна.
       Хэрэв энэ хугацаанд 2-р tap ирвэл дээрх блокт цуцлагдана. */
    lastTapRef.current = { t: now, side };
    clearTimeout(singleTapTimer.current);
    singleTapTimer.current = setTimeout(() => {
      togglePlay();
      revealControls();
      lastTapRef.current = null;
    }, 280);
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

  function setQuality(q: string) { playerRef.current?.setPlaybackQuality(q); }

  function handleReplay() {
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
    setEnded(false);
  }

  return (
    <div ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden select-none">

      {/* Poster — player эхлээгүй үед */}
      {!started && (
        <VodPlayerPoster
          title={title}
          thumbnailUrl={thumbnailUrl}
          duration={duration}
          isLoggedIn={!!user}
          loginLabel={t("login")}
          onStart={initPlayer}
        />
      )}

      {/* YouTube iframe — pointer-events: none → YouTube hover event-ийг авахгүй
          → playback үед YouTube controls bar, watermark, "More videos" гарахгүй.
          Inline style нь YT.Player iframe-ээр солихоос ч хойш хүчинтэй (inherit). */}
      <div className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <div id={`yt-${youtubeId}`} className="w-full h-full" style={{ pointerEvents: "none" }} />
      </div>

      {/* Loading */}
      {started && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="w-12 h-12 border-[3px] border-white/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Click overlay + controls — pause/end үед бүтэн дарагдсан → YouTube
          "More videos" гарахгүй. Play үед бүх mouse interaction-ийг шингээнэ.
          handleTap нь single-tap → toggle, double-tap → seek ±10s (YouTube-маяг). */}
      {started && ready && (
        <div className="absolute inset-0 z-[22] cursor-pointer"
          onClick={handleTap}
          onMouseMove={revealControls}
          onMouseLeave={() => playing && setShowControls(false)}>

          {ended && <ReplayButton onReplay={handleReplay} />}

          {/* Mobile center play/pause — товч голд тод харагдана. Single-tap
              хийхэд togglePlay-тай parent overlay шууд handle хийнэ. */}
          {!playing && !ended && !skipHint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/55 backdrop-blur flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Double-tap seek feedback — 500ms badge */}
          {skipHint && (
            <div className={cn(
              "absolute top-0 bottom-0 flex items-center justify-center pointer-events-none",
              skipHint === "back" ? "left-0 w-1/2" : "right-0 w-1/2",
            )}>
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-black/55 backdrop-blur text-white animate-fade-in">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  {skipHint === "back"
                    ? <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" transform="scale(-1,1) translate(-24,0)"/>
                    : <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>}
                </svg>
                <span className="text-[12px] font-bold tabular-nums">
                  {skipHint === "back" ? "−10 сек" : "+10 сек"}
                </span>
              </div>
            </div>
          )}

          <div className={cn(
            "absolute inset-x-0 bottom-0 transition-opacity duration-300",
            "bg-gradient-to-t from-black/90 via-black/30 to-transparent pt-16 pb-3 px-4",
            !playing || showControls ? "opacity-100" : "opacity-0",
          )} onClick={(e) => e.stopPropagation()}>
            <VodPlayerControls
              current={current}
              total={total}
              playing={playing}
              muted={muted}
              volume={volume}
              fullscreen={fullscreen}
              qualities={qualities}
              thumbnailUrl={thumbnailUrl}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onSeek={handleSeek}
              onQuality={setQuality}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>
      )}
    </div>
  );
}
