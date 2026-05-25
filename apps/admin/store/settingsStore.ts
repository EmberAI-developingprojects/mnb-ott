import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ════════════════════════════════════════════════════════════════
   АДМИН ХЭРЭГЛЭГЧИЙН ХУВИЙН ТОХИРГОО (theme).
   Client-ийн store/settingsStore.ts-ийн загвараар, persist-тэй.
   localStorage key: "mnb-admin-settings" → {state:{theme}, version:0}

   ⚠️ FOUC script (app/layout.tsx) болон ThemeProvider энэ key-г уншина —
   key/shape өөрчилбөл тэр 2-ыг хамт засна.
   Default = "dark" (анхны ачаалалд).
   ════════════════════════════════════════════════════════════════ */

export type Theme = "dark" | "light";

interface SettingsStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "mnb-admin-settings" },
  ),
);
