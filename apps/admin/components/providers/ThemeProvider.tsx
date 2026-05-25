"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

/* Сонгосон theme-ийг <html data-theme>-д тусгана.
   :root = light (default), [data-theme="dark"] = dark override (globals.css).
   Light үед attribute-ийг устгана — :root л үлдэнэ.
   FOUC script (layout.tsx)-тай ИЖИЛ конвенц байх ёстой. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
  }, [theme]);

  return <>{children}</>;
}
