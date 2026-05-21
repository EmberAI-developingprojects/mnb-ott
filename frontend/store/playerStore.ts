import { create } from "zustand";

interface PlayerState {
  currentChannelId: string | null;
  currentVodId: string | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  quality: string;
  setChannel: (id: string) => void;
  setVod: (id: string) => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setQuality: (q: string) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentChannelId: null,
  currentVodId: null,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  quality: "auto",
  setChannel: (id) => set({ currentChannelId: id, currentVodId: null }),
  setVod: (id) => set({ currentVodId: id, currentChannelId: null }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setMuted: (v) => set({ isMuted: v }),
  setQuality: (q) => set({ quality: q }),
  clear: () => set({ currentChannelId: null, currentVodId: null, isPlaying: false }),
}));
