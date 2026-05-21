import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  addedAt: string;
}

interface WatchlistStore {
  items: WatchlistItem[];
  add: (item: Omit<WatchlistItem, "addedAt">) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: [{ ...item, addedAt: new Date().toISOString() }, ...s.items],
        })),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: "mnb-watchlist" }
  )
);
