"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore, type Lang, type Theme } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

/* Хэл (mn/en) + theme (dark/light) сонгох dropdown.
   Зочин ч, нэвтэрсэн ч ил харагдана. */
export function LangThemeMenu() {
  const { lang, theme, setLang, setTheme } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Хэл / theme"
        className="w-10 h-10 flex items-center justify-center rounded-full text-sub hover:text-app hover:bg-card-hover transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden z-50 surface-base shadow-pop animate-fade-in">
          <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted">Хэл</div>
          <div className="px-2 pb-1 flex gap-1">
            {([
              { val: "mn" as Lang, label: "Монгол" },
              { val: "en" as Lang, label: "English" },
            ]).map((l) => (
              <button key={l.val} onClick={() => { setLang(l.val); setOpen(false); }}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors",
                  lang === l.val ? "bg-brand text-white" : "text-sub hover:text-app hover:bg-card-hover",
                )}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted">Theme</div>
          <div className="px-2 pb-2 flex gap-1">
            {([
              { val: "dark"  as Theme, label: "Dark"  },
              { val: "light" as Theme, label: "Light" },
            ]).map((th) => (
              <button key={th.val} onClick={() => { setTheme(th.val); setOpen(false); }}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors",
                  theme === th.val ? "bg-brand text-white" : "text-sub hover:text-app hover:bg-card-hover",
                )}>
                {th.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
