"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface MenuItem { href: string; label: string; }

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useAuthStore();
  const { lang } = useSettingsStore();
  const t = useT();

  const ACCOUNT_MENU: MenuItem[] = [
    { href: "/profile/account",      label: t("account_info") },
    { href: "/profile/subscription", label: t("subscription") },
    { href: "/profile/purchases",    label: t("purchases")    },
    { href: "/profile/devices",      label: t("devices")      },
    { href: "/profile/settings",     label: t("settings")     },
  ];

  const SUPPORT_MENU: MenuItem[] = [
    { href: "/profile/help",    label: lang === "mn" ? "Түгээмэл асуулт"     : "Help & FAQ" },
    { href: "/profile/terms",   label: lang === "mn" ? "Үйлчилгээний нөхцөл" : "Terms of Service" },
    { href: "/profile/privacy", label: lang === "mn" ? "Нууцлалын бодлого"   : "Privacy Policy" },
  ];

  const ALL = [...ACCOUNT_MENU, ...SUPPORT_MENU];
  const current = ALL.find((m) => m.href === pathname);
  const isMenuPage = pathname === "/profile";

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-[calc(var(--header-h)+24px)] pb-16">
      <div className="flex gap-10">

        {/* Sidebar (desktop only) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-[calc(var(--header-h)+24px)] self-start">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-app">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-grad-brand flex items-center justify-center text-white font-bold text-lg">
                {(user?.name ?? user?.phone ?? "U")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-app text-sm font-semibold truncate">{user?.name ?? t("profile")}</p>
              <p className="text-muted text-xs truncate">{user?.phone ?? user?.email}</p>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-2 px-3">
            {lang === "mn" ? "Бүртгэл" : "Account"}
          </p>
          <nav className="space-y-0.5 mb-6">
            {ACCOUNT_MENU.map((m) => (
              <SidebarLink key={m.href} href={m.href} label={m.label} active={pathname === m.href} />
            ))}
          </nav>

          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-2 px-3">
            {lang === "mn" ? "Тусламж" : "Support"}
          </p>
          <nav className="space-y-0.5">
            {SUPPORT_MENU.map((m) => (
              <SidebarLink key={m.href} href={m.href} label={m.label} active={pathname === m.href} />
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile sub-page header: back to /profile + section title */}
          {!isMenuPage && (
            <div className="lg:hidden mb-6 flex items-center gap-2 -ml-2">
              <button onClick={() => router.push("/profile")} aria-label="Profile menu"
                className="flex items-center gap-1.5 pl-1.5 pr-3 py-2 rounded-full text-sub hover:text-app hover:bg-card-hover transition-colors shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                <span className="text-[14px] font-semibold">{t("profile")}</span>
              </button>
              <span className="text-muted/40">·</span>
              <h2 className="flex-1 text-[15px] font-bold text-app truncate">
                {current?.label ?? t("profile")}
              </h2>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}
      className={cn(
        "relative flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
        active ? "text-app bg-card" : "text-sub hover:text-app hover:bg-card-hover",
      )}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />}
      <span className={cn(active && "ml-2")}>{label}</span>
    </Link>
  );
}
