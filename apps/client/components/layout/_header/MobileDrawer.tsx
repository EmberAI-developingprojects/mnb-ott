"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem { label: string; href: string; live?: boolean }

/* Mobile bottom sheet drawer — Hamburger дарахад bottom nav-ийн дээрээс дээш
   ил гарна. Backdrop эсвэл аль ч link дарвал хаагдана.
   z-50 — header (z-40) болон bottom nav (z-40)-аас дээгүүр давхрагатай. */
export function MobileDrawer({ navKeys, onClose, t, user }: {
  navKeys: NavItem[];
  onClose: () => void;
  t:       (k: string) => string;
  user:    { id: string } | null;
}) {
  const pathname = usePathname();
  const all: NavItem[] = [
    ...navKeys,
    { label: "library",  href: "/library" },
    { label: "bundles",  href: "/bundles" },
    { label: "archive",  href: "/archive" },
    ...(user ? [{ label: "watchlist", href: "/watchlist" }] : []),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Backdrop — header-ийн доороос bottom nav хүртэл */}
      <div onClick={onClose}
        className="lg:hidden fixed inset-x-0 top-0 z-40 bg-app/60 backdrop-blur-sm
          bottom-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))] animate-fade-in" />

      {/* Sheet — bottom nav-ийн дээр байрлаж дээш нээгдэнэ */}
      <div id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Үндсэн цэс"
        className="lg:hidden fixed inset-x-0 z-50 bg-elevated border-t border-app
        rounded-t-2xl shadow-pop animate-slide-up
        bottom-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom))]
        max-h-[70vh] overflow-y-auto">

        {/* Drag handle — bottom sheet-ийн жижиг indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-strong/40" />
        </div>

        <div className="p-3 pb-5 space-y-1">
          {all.map((n) => {
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 rounded-lg text-[15px] font-medium transition-colors",
                  active
                    ? "bg-card-hover text-app font-semibold"
                    : "text-sub hover:text-app hover:bg-card-hover",
                )}>
                {n.live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse-soft" />}
                {t(n.label)}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
