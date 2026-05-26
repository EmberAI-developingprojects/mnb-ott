import { create } from "zustand";

/* Уншаагүй мэдэгдлийн тоог header + /notifications хуудас 2-уулангаас ашиглах
   shared state. Header polling-аар обновляется, харин read үйлдэл хийгдэхэд
   shared store-руу шууд бичээд UI агшнаар sync болно. */
interface NotificationsStore {
  unread:        number;
  setUnread:     (n: number) => void;
  /* Нэг мэдэгдэл уншсан үед — count буурах (0-ээс багасахгүй) */
  decrement:     () => void;
  /* Бүгдийг уншсан — 0 болгож reset */
  clear:         () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unread:    0,
  setUnread: (n) => set({ unread: Math.max(0, n) }),
  decrement: () => set((s) => ({ unread: Math.max(0, s.unread - 1) })),
  clear:     () => set({ unread: 0 }),
}));
