"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/* Mobile bottom navigation — Apple-style 5-tab nav */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const t = useT();

  const TABS = [
    {
      href:  "/",
      label: t("home"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      ),
    },
    {
      href:  "/tv",
      label: t("tv"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="13" rx="2" />
          <polyline points="17 2 12 7 7 2" />
        </svg>
      ),
    },
    {
      href:  "/search",
      label: t("search_btn"),
      icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
    },
    {
      href:  "/library",
      label: t("library"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      ),
    },
    {
      href:  user ? "/profile" : "/login",
      label: user ? t("profile") : t("login"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
    },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-app
        pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <div className="flex items-center justify-around h-[var(--bottomnav-h)] max-w-[600px] mx-auto px-2">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
                  active ? "text-app" : "text-muted hover:text-app",
                )}>
                {tab.icon(active)}
                <span className={cn("text-[10px] font-medium", active && "font-semibold")}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer so content isn't covered */}
      <div className="lg:hidden h-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))]" />
    </>
  );
}
