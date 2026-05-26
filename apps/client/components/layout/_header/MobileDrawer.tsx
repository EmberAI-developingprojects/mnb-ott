"use client";

import Link from "next/link";

interface NavItem { label: string; href: string; live?: boolean }

/* Mobile-ийн hamburger drawer — Header-ийн NAV_KEYS + extra links (library,
   bundles, archive, watchlist).  Backdrop дарвал хаагдана. */
export function MobileDrawer({ navKeys, onClose, t, user }: {
  navKeys: NavItem[];
  onClose: () => void;
  t:       (k: string) => string;
  user:    { id: string } | null;
}) {
  const all: NavItem[] = [
    ...navKeys,
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
