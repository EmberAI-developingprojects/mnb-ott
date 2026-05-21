"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const t = useT();

  const MENU = [
    { href: "/profile",              key: "account_info" },
    { href: "/profile/security",     key: "security"     },
    { href: "/profile/subscription", key: "subscription" },
    { href: "/profile/devices",      key: "devices"      },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex gap-8">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0">
          {/* Avatar */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-app">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0046A5] to-blue-700
                flex items-center justify-center text-white font-bold text-lg">
                {(user?.name ?? user?.phone ?? "U")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-app text-sm font-semibold truncate">{user?.name ?? t("profile")}</p>
              <p className="text-muted text-xs truncate">{user?.phone ?? user?.email}</p>
            </div>
          </div>

          <nav className="space-y-0.5">
            {MENU.map(({ href, key }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-xl text-sm transition-all font-medium",
                    active
                      ? "text-[#0046A5] bg-[#0046A5]/10"
                      : "text-muted hover:text-app hover:bg-app"
                  )}>
                  {t(key)}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="lg:hidden flex overflow-x-auto gap-1 mb-6">
            {MENU.map(({ href, key }) => (
              <Link key={href} href={href}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all border border-app",
                  pathname === href
                    ? "bg-[#0046A5] text-white border-transparent"
                    : "text-muted hover:text-app"
                )}>
                {t(key)}
              </Link>
            ))}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
