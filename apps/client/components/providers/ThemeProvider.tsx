"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("light", theme === "light");
    html.classList.toggle("dark",  theme === "dark");
    /* colorScheme — browser native UI (scrollbar, form input, input[type=date]
       picker гэх мэт)-ийг theme-тэй sync байлгана. layout.tsx inline script
       initial-д тавьдаг, theme солих үед энд update хийнэ. */
    html.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}
