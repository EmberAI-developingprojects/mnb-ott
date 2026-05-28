"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { LangThemeMenu } from "./_header/LangThemeMenu";
import { UserMenu } from "./_header/UserMenu";

const NAV_KEYS = [
  { label: "home", href: "/",    live: false },
  { label: "tv",   href: "/tv",  live: false },
  { label: "live", href: "/live", live: true  },
];

export function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const t = useT();

  const [q, setQ] = useState("");
  /* Уншаагүй мэдэгдлийн тоо — shared store. /notifications хуудаснаас read үед
     store шууд шинэчлэгдэх → header dot шууд алга болно. */
  const { unread, setUnread } = useNotificationsStore();

  const isSearchPage = pathname === "/search";

  /* Sync search query when on /search */
  useEffect(() => {
    if (isSearchPage) {
      setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    } else setQ("");
  }, [pathname, isSearchPage]);

  /* Type-as-you-search — 350ms debounce */
  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) return;
    const id = setTimeout(() => {
      if (isSearchPage) router.replace(`/search?q=${encodeURIComponent(v)}`);
      else              router.push(`/search?q=${encodeURIComponent(v)}`);
    }, 350);
    return () => clearTimeout(id);
  }, [q, isSearchPage, router]);

  /* Unread count — нэг удаа load + tab focus үед refresh.
     Notification нь шууд realtime биш, polling нь 50k user-ийн scale-д
     server-д хэт их ачаалал тавьдаг (60с тутамд бүгд DB-руу). */
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let stop = false;
    const load = async () => {
      try {
        const r = await api.get<{ success: true; data: { unread: number } }>("/api/notifications/unread-count");
        if (!stop) setUnread(r.data.data.unread);
      } catch {}
    };
    load();
    /* User tab-руу буцаж ороход (өөр tab-аас, эсвэл компьютер унтсаны дараа)
       шинэчилнэ. Polling биш — зөвхөн идэвхтэй чухал мөчид. */
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { stop = true; window.removeEventListener("focus", onFocus); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user?.id]);

  async function handleLogout() {
    /* Эхэлж "/" руу navigate (private page-ийн useEffect activate хийгдэхээс
       өмнө). Дараа нь clearAuth() — server state цэвэр болов. router.refresh()
       нь Server Component-ийн cache-ийг reset хийнэ. */
    try { await api.post("/api/auth/logout"); } catch { /* silent */ }
    router.push("/");
    router.refresh();
    /* Жижиг delay нь navigate trigger болсны дараа state цэвэрлэх — race
       condition үүсгэхгүй (private page-ийн useEffect-ийг late-evaluating). */
    setTimeout(() => clearAuth(), 50);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) {
      if (isSearchPage) router.replace(`/search?q=${encodeURIComponent(v)}`);
      else              router.push(`/search?q=${encodeURIComponent(v)}`);
    }
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /* ─── /search хуудас + mobile → back + search UX (Facebook жишгээр) ── */
  if (isSearchPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-elevated border-b border-app">
        <div className="max-w-[1440px] mx-auto px-3 md:px-8 h-[var(--header-h)] flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="Буцах"
            className="w-11 h-11 -ml-1 flex items-center justify-center rounded-full text-app hover:bg-card-hover transition-colors shrink-0">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <form onSubmit={submitSearch} className="flex-1" role="search">
            <label htmlFor="header-search-input" className="sr-only">Хайх</label>
            <div className="relative">
              <svg aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="header-search-input"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_ph")}
                aria-label="Хайх"
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-[15px] input-base focus:outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Цэвэрлэх"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-app hover:bg-card-hover">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-elevated border-b border-app">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-[var(--header-h)] flex items-center gap-3">

        {/* Brand logo — mobile-д зүүн талд ганцаар */}
        <Link href="/" aria-label="Нүүр хуудас" className="shrink-0 flex items-center mr-4">
          <Image src="/logo.png" alt="" width={36} height={36} priority className="w-9 h-9 object-cover rounded" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_KEYS.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn(
                "relative px-4 py-2.5 text-[15px] font-semibold rounded-lg transition-colors",
                isActive(n.href) ? "text-app" : "text-sub hover:text-app",
              )}>
              <span className="flex items-center gap-1.5">
                {n.live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft" />}
                {t(n.label)}
              </span>
              {isActive(n.href) && (
                <span className="absolute left-4 right-4 -bottom-1 h-[2px] rounded-full bg-accent" />
              )}
            </Link>
          ))}

          {user && (
            <Link href="/watchlist"
              className={cn(
                "relative px-4 py-2.5 text-[15px] font-semibold rounded-lg transition-colors",
                isActive("/watchlist") ? "text-app" : "text-sub hover:text-app",
              )}>
              {t("watchlist")}
              {isActive("/watchlist") && (
                <span className="absolute left-4 right-4 -bottom-1 h-[2px] rounded-full bg-accent" />
              )}
            </Link>
          )}
        </nav>

        {/* Desktop search — үргэлж нээлттэй pill, nav-ийн дараа center-thru.
            Lg-аас доош хураагдсан хэвээр (mobile-аас Header-ийн search route ашиглана). */}
        <form onSubmit={submitSearch} className="hidden lg:flex flex-1 justify-center px-6" role="search">
          <label htmlFor="header-search-desktop" className="sr-only">Хайх</label>
          <div className="relative w-full max-w-md">
            <svg aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="header-search-desktop"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search_ph")}
              aria-label="Хайх"
              className="w-full h-10 pl-11 pr-9 rounded-full text-[14px]
                bg-card border border-app
                focus:outline-none focus:border-strong focus:bg-bg-elevated transition-colors
                placeholder:text-muted"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Цэвэрлэх"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                  flex items-center justify-center text-muted hover:text-app hover:bg-card-hover transition-colors">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Lg-аас доош spacer л */}
        <div className="flex-1 lg:hidden" />

        {/* Right controls */}
        <div className="flex items-center gap-1">

          <LangThemeMenu />

          {/* Notifications — desktop + mobile. Уншаагүй бол зөвхөн жижиг dot. */}
          {user && (
            <Link href="/notifications" aria-label={unread > 0 ? `Мэдэгдэл (${unread} шинэ)` : "Мэдэгдэл"}
              className={cn(
                "relative w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                isActive("/notifications")
                  ? "bg-card-hover text-app"
                  : "text-sub hover:text-app hover:bg-card-hover",
              )}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span aria-hidden="true"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-[var(--bg-primary)]" />
              )}
            </Link>
          )}

          {/* Profile — DESKTOP ONLY (mobile-д bottom nav-д бий) */}
          {user ? (
            <div className="hidden lg:block">
              <UserMenu user={user} t={t} onLogout={handleLogout} />
            </div>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="hidden lg:inline-flex ml-1 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-[14px] font-semibold rounded-full active:scale-95 transition-all">
              {t("login")}
            </Link>
          )}

          {/* Search icon — mobile only. Desktop-д header center-д nav-аас хойш inline pill бий. */}
          <Link href="/search" aria-label="Хайх"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-sub hover:text-app hover:bg-card-hover transition-colors">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
