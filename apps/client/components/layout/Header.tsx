"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const NAV_KEYS = [
  { label: "home",      href: "/",         live: false },
  { label: "tv",        href: "/tv",       live: false },
  { label: "live",      href: "/live",     live: true  },
];

export function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const t = useT();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [q, setQ]       = useState("");
  const [unread, setUnread] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const isSearchPage = pathname === "/search";

  /* Sync search query when on /search */
  useEffect(() => {
    if (isSearchPage) {
      setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    } else setQ("");
  }, [pathname, isSearchPage]);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) return;
    /* /search дотор query өөрчлөгдөхөд replace ашиглана — history-д олон entry үүсэхгүй */
    const id = setTimeout(() => {
      if (isSearchPage) router.replace(`/search?q=${encodeURIComponent(v)}`);
      else              router.push(`/search?q=${encodeURIComponent(v)}`);
    }, 350);
    return () => clearTimeout(id);
  }, [q, isSearchPage, router]);

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
    const iv = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(iv); };
  }, [user?.id]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try { await api.post("/api/auth/logout"); } finally {
      clearAuth(); router.push("/");
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) {
      if (isSearchPage) router.replace(`/search?q=${encodeURIComponent(v)}`);
      else              router.push(`/search?q=${encodeURIComponent(v)}`);
      setSearchOpen(false); setMobileOpen(false);
    }
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /* ─────────────────────────────────────────────
     /search хуудас + mobile → back + search UX
     (Facebook жишгээр)
     ───────────────────────────────────────────── */
  if (isSearchPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-elevated border-b border-app">
        <div className="max-w-[1440px] mx-auto px-3 md:px-8 h-[var(--header-h)] flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="Back"
            className="w-11 h-11 -ml-1 flex items-center justify-center rounded-full text-app hover:bg-card-hover transition-colors shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <form onSubmit={submitSearch} className="flex-1">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_ph")}
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-[15px] input-base focus:outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-app hover:bg-card-hover">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        {/* Hamburger (mobile only) */}
        <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu"
          className="lg:hidden w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-card-hover transition-colors text-app">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Brand text logo */}
        <Link href="/" className="shrink-0 flex items-center mr-4">
          <span
            className="text-[22px] md:text-[24px] font-black tracking-[0.02em] leading-none"
            style={{ color: "#CF1E28" }}>
            M<span style={{ color: "#0046A5" }}>N</span>B
          </span>
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

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1">

          {/* Desktop search (inline expandable) */}
          <div className="hidden lg:block">
            {!searchOpen ? (
              <button onClick={() => setSearchOpen(true)} aria-label="Search"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-card-hover transition-colors text-sub hover:text-app">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            ) : (
              <form onSubmit={submitSearch} className="flex items-center w-80">
                <div className="relative w-full">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
                    onBlur={() => !q && setSearchOpen(false)}
                    placeholder={t("search_ph")}
                    className="w-full pl-10 pr-3 py-2.5 rounded-full text-[15px] input-base focus:outline-none" />
                </div>
              </form>
            )}
          </div>

          {/* Notifications — desktop + mobile (bottom nav-д үгүй учраас үлдээнэ) */}
          {user && (
            <Link href="/notifications" aria-label="Notifications"
              className={cn(
                "relative w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                isActive("/notifications")
                  ? "bg-card-hover text-app"
                  : "text-sub hover:text-app hover:bg-card-hover",
              )}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--danger)]
                  text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-elevated)]">
                  {unread > 9 ? "9+" : unread}
                </span>
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
        </div>
      </div>

      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} t={t} user={user} />}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────
   User profile dropdown
───────────────────────────────────────────────────────── */
function UserMenu({ user, t, onLogout }: {
  user: { id: string; name?: string; email?: string; phone?: string; avatar?: string; role?: string };
  t: (k: string) => string;
  onLogout: () => void;
}) {
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
    <div ref={ref} className="relative ml-1">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-card-hover transition-colors">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--border-strong)]" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-[13px] font-bold">
            {(user.name ?? user.phone ?? user.email ?? "U")[0].toUpperCase()}
          </div>
        )}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={cn("hidden sm:block transition-transform text-muted", open && "rotate-180")}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden z-50 surface-base shadow-pop animate-fade-in">
          <div className="px-4 py-3 border-b border-app">
            <p className="text-sm font-semibold text-app truncate">{user.name ?? "Хэрэглэгч"}</p>
            <p className="text-xs text-muted truncate mt-0.5">{user.phone ?? user.email}</p>
          </div>
          <div className="py-1">
            {[
              { href: "/profile/account",      label: t("account_info") },
              { href: "/profile/subscription", label: t("subscription") },
              { href: "/profile/devices",      label: t("devices") },
              { href: "/profile/settings",     label: t("settings") },
            ].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="flex items-center px-4 py-2 text-[13px] text-sub hover:text-app hover:bg-card-hover transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t border-app">
            <button onClick={onLogout}
              className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-danger hover:bg-danger-soft transition-colors">
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Mobile drawer
───────────────────────────────────────────────────────── */
interface NavItem { label: string; href: string; live?: boolean }

function MobileDrawer({ onClose, t, user }: {
  onClose: () => void; t: (k: string) => string;
  user: { id: string } | null;
}) {
  const all: NavItem[] = [
    ...NAV_KEYS,
    { label: "library",  href: "/library" },
    { label: "bundles",  href: "/bundles" },
    { label: "archive",  href: "/archive" },
    ...(user ? [{ label: "watchlist", href: "/watchlist" }] : []),
  ];
  return (
    <>
      <div className="lg:hidden fixed inset-0 top-[var(--header-h)] bg-app/60 backdrop-blur-sm" onClick={onClose} />
      <div className="lg:hidden absolute top-full inset-x-0 bg-elevated border-b border-app shadow-pop animate-fade-in p-4 space-y-1">
        {all.map((n) => (
          <Link key={n.href} href={n.href} onClick={onClose}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium text-sub hover:text-app hover:bg-card-hover transition-colors">
            {n.live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft" />}
            {t(n.label)}
          </Link>
        ))}
      </div>
    </>
  );
}
