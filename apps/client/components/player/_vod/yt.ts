/* YouTube IFrame API типүүд + loader helper.
   VodPlayer-ийн main file-аас 56 мөр салгаж жижигрүүлсэн. */

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export declare namespace YT {
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
    videoId:    string;
    width?:     string;
    height?:    string;
    host?:      string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?:       (e: { target: Player }) => void;
      onStateChange?: (e: { data: number; target: Player }) => void;
      onError?:       (e: { data: number }) => void;
    };
  }
}

/* YouTube IFrame API скриптийг хуудсанд нэг л удаа inject хийнэ.
   onYouTubeIframeAPIReady нь global callback — backend-аас дуудагдана. */
export function loadYTScript(): Promise<void> {
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
