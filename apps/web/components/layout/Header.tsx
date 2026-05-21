"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { lang, setLang, theme, toggleTheme } = useSettingsStore();
  const t = useT();

  const [scrolled,     setScrolled]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [q, setQ] = useState("");

  const NAV = [
    { label: t("home"), href: "/",     live: false },
    { label: t("tv"),   href: "/tv",   live: false },
    { label: t("live"), href: "/live", live: true  },
  ];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // /search хуудас руу орох үед header input-ийг URL-ийн q-тэй синхрончлох
  useEffect(() => {
    if (pathname === "/search") {
      const urlQ = new URLSearchParams(window.location.search).get("q") ?? "";
      setQ(urlQ);
    } else {
      setQ("");
    }
  }, [pathname]);

  // Бичиж байхад хайлт хийх (350ms debounce, 2+ тэмдэгт)
  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) return;
    const timer = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(v)}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  async function handleLogout() {
    try { await api.post("/api/auth/logout"); } finally {
      clearAuth(); router.push("/");
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) { router.push(`/search?q=${encodeURIComponent(v)}`); setMobileOpen(false); }
  }

  const isLight = theme === "light";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? isLight
            ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-black/8"
            : "bg-[#08080F]/96 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/[0.05]"
          : "bg-gradient-to-b from-black/60 to-transparent"
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-[72px] flex items-center gap-4">

        {/* Logo — текстгүй, зөвхөн дүрс */}
        <Link href="/" className="shrink-0 mr-1">
          <div className="relative w-10 h-10">
            <Image src="/mnb.png" alt="МНБ" fill className="object-contain" />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map((n) => {
            const active = pathname === n.href ||
              (n.href === "/tv"   && pathname.startsWith("/tv")) ||
              (n.href === "/live" && pathname === "/live");
            return (
              <Link key={n.href} href={n.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all rounded-lg",
                  active
                    ? isLight ? "text-[#0046A5]" : "text-white"
                    : isLight ? "text-black/65 hover:text-black hover:bg-black/5"
                               : "text-white/80 hover:text-white hover:bg-white/8"
                )}>
                {n.live && <span className="w-1.5 h-1.5 rounded-full bg-[#CF1E28] animate-pulse shrink-0" />}
                {n.label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#0046A5] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Search — CSS var ашигласан, ямарч дэвсгэр дээр харагдана */}
        <form onSubmit={handleSearch} className="relative hidden md:flex flex-1 max-w-xs ml-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_ph")}
            className="w-full pl-9 pr-4 py-2 rounded-full text-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[#0046A5]/30
              border input-base"
          />
        </form>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1">

          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === "mn" ? "en" : "mn")}
            className={cn(
              "hidden md:flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all",
              isLight
                ? "text-black/60 hover:text-black hover:bg-black/6"
                : "text-white/75 hover:text-white hover:bg-white/8"
            )}
          >
            {lang === "mn" ? "EN" : "MN"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-all",
              isLight
                ? "text-black/60 hover:text-black hover:bg-black/6"
                : "text-white/75 hover:text-white hover:bg-white/8"
            )}
            title={isLight ? "Dark mode" : "Light mode"}
          >
            {isLight ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>

          {/* Watchlist */}
          <Link href="/watchlist"
            className={cn(
              "hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-all",
              isLight ? "text-black/60 hover:text-black hover:bg-black/6" : "text-white/75 hover:text-white hover:bg-white/8"
            )}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </Link>

          {/* User / Login */}
          {user ? (
            <div className="relative ml-1">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className={cn("flex items-center gap-2 px-1.5 py-1 rounded-full transition-all",
                  isLight ? "hover:bg-black/6" : "hover:bg-white/6")}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--border-strong)]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0046A5] to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                    {(user.name ?? user.phone ?? "U")[0].toUpperCase()}
                  </div>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={cn("hidden sm:block transition-transform", dropdownOpen && "rotate-180",
                    isLight ? "text-black/55" : "text-white/65")}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className={cn(
                    "absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 shadow-2xl border",
                    isLight ? "bg-white border-black/8 shadow-black/10" : "bg-[#111118] border-white/8 shadow-black/50"
                  )}>
                    <div className={cn("px-4 py-3 border-b", isLight ? "border-black/6" : "border-white/6")}>
                      <p className={cn("text-xs font-semibold mb-0.5", isLight ? "text-black/80" : "text-white/90")}>
                        {user.name ?? "Хэрэглэгч"}
                      </p>
                      <p className={cn("text-xs truncate", isLight ? "text-black/50" : "text-white/55")}>
                        {user.phone ?? user.email}
                      </p>
                    </div>
                    {[
                      { href: "/profile",              label: t("profile") },
                      { href: "/profile/subscription", label: t("subscription") },
                      { href: "/watchlist",             label: t("watchlist") },
                      ...(["ADMIN","SUPER_ADMIN"].includes(user.role ?? "")
                        ? [{ href: "/admin/settings", label: t("settings") }] : []),
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setDropdownOpen(false)}
                        className={cn(
                          "block px-4 py-2.5 text-sm transition-colors",
                          isLight ? "text-black/75 hover:text-black hover:bg-black/5" : "text-white/85 hover:text-white hover:bg-white/8"
                        )}>
                        {label}
                      </Link>
                    ))}
                    <div className={cn("border-t", isLight ? "border-black/6" : "border-white/6")}>
                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#CF1E28]/80 hover:text-[#CF1E28] transition-colors">
                        {t("logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="ml-1 px-4 py-2 bg-[#0046A5] text-white text-sm font-semibold rounded-full hover:bg-blue-600 active:scale-95 transition-all">
              {t("login")}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className={cn("md:hidden ml-1 w-9 h-9 flex items-center justify-center rounded-full transition-all",
              isLight ? "text-black/75 hover:bg-black/6" : "text-white/85 hover:bg-white/8")}>
            {mobileOpen
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="13" x2="21" y2="13"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className={cn(
          "md:hidden border-t px-4 py-4 space-y-1",
          isLight ? "bg-white/98 border-black/8" : "bg-[#08080F]/98 border-white/6 backdrop-blur-xl"
        )}>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_ph")}
              className="flex-1 px-4 py-2 rounded-full text-sm focus:outline-none border input-base" />
            <button type="submit" className="px-4 py-2 bg-[#0046A5] text-white text-sm font-semibold rounded-full">
              {t("search_btn")}
            </button>
          </form>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
              className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                pathname === n.href
                  ? isLight ? "text-[#0046A5] bg-[#0046A5]/8" : "text-white bg-white/10"
                  : isLight ? "text-black/70" : "text-white/85")}>
              {n.live && <span className="w-1.5 h-1.5 rounded-full bg-[#CF1E28] animate-pulse shrink-0" />}
              {n.label}
            </Link>
          ))}
          <div className={cn("flex items-center gap-2 pt-3 border-t", isLight ? "border-black/6" : "border-white/6")}>
            <button onClick={() => setLang(lang === "mn" ? "en" : "mn")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold",
                isLight ? "bg-black/6 text-black/75" : "bg-white/12 text-white/90")}>
              {lang === "mn" ? "EN" : "MN"}
            </button>
            <button onClick={toggleTheme}
              className={cn("p-1.5 rounded-lg", isLight ? "bg-black/6 text-black/75" : "bg-white/12 text-white/90")}>
              {isLight
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
              }
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
