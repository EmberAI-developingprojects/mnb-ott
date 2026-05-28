"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface UserLike {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
}

/* Хэрэглэгчийн profile dropdown — desktop right. Account / Subscription /
   Devices / Settings + logout. Outside click нээгдсэн дропдаунийг хаана. */
export function UserMenu({ user, t, onLogout }: {
  user:     UserLike;
  t:        (k: string) => string;
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
        aria-label="Хэрэглэгчийн цэс"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-card-hover transition-colors">
        {user.avatar ? (
          <Image src={user.avatar} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--border-strong)]" />
        ) : (
          <div aria-hidden="true" className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-[13px] font-bold">
            {(user.name ?? user.phone ?? user.email ?? "U")[0].toUpperCase()}
          </div>
        )}
        <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
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
