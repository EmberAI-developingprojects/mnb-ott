"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("light", theme === "light");
    html.classList.toggle("dark",  theme === "dark");
  }, [theme]);

  return <>{children}</>;
}
