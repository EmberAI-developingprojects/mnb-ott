"use client";

import { useEffect } from "react";
import { useSettingsStore, type Lang, type Theme } from "@/store/settingsStore";

declare global {
  interface Window {
    __MNB_INIT__?: { theme?: Theme; lang?: Lang; hasStored?: boolean };
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme   = useSettingsStore((s) => s.theme);
  const setLang = useSettingsStore((s) => s.setLang);
  const setTheme = useSettingsStore((s) => s.setTheme);

  /* First-visit detection — хэрэв хэрэглэгч анх удаа орж байгаа бол (localStorage
     хоосон), layout.tsx-ийн inline script-аас үлдээсэн OS preference + browser
     хэлийг store-руу зөөнө. Зөвхөн нэг л удаа mount дээр ажиллана.
     SSR mismatch үүсэхгүй учир нь useEffect нь client only ажилладаг. */
  useEffect(() => {
    const init = window.__MNB_INIT__;
    if (init && !init.hasStored) {
      /* hasStored=false → localStorage хоосон → OS-аас уламжилсан утга apply */
      if (init.lang)  setLang(init.lang);
      if (init.theme) setTheme(init.theme);
    }
  }, [setLang, setTheme]);

  /* Theme солих үед <html>-д class + colorScheme. layout.tsx-ийн inline script
     initial-д тавьдаг, энд subsequent change-ийг хариуцна. */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("light", theme === "light");
    html.classList.toggle("dark",  theme === "dark");
    html.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}
