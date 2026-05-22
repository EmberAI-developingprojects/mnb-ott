"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api from "@/lib/api";

/* /profile — iOS Settings маягийн menu list page
   Хэрэглэгчийн мэдээлэл /profile/account руу шилжсэн */
export default function ProfileMenuPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { lang } = useSettingsStore();
  const t = useT();

  useEffect(() => {
    if (!user) router.push("/login?callbackUrl=/profile");
  }, [user, router]);

  async function handleLogout() {
    try { await api.post("/api/auth/logout"); } catch { /* silent */ }
    clearAuth();
    router.push("/");
  }

  if (!user) return null;

  const ACCOUNT_MENU: MenuItem[] = [
    { href: "/profile/account",      label: t("account_info"), icon: ICON.user },
    { href: "/profile/subscription", label: t("subscription"), icon: ICON.subscription },
    { href: "/profile/purchases",    label: t("purchases"),    icon: ICON.purchases },
    { href: "/profile/devices",      label: t("devices"),      icon: ICON.devices },
    { href: "/profile/settings",     label: t("settings"),     icon: ICON.settings },
  ];

  const SUPPORT_MENU: MenuItem[] = [
    { href: "/profile/help",    label: lang === "mn" ? "Түгээмэл асуулт"     : "Help & FAQ",       icon: ICON.help },
    { href: "/profile/terms",   label: lang === "mn" ? "Үйлчилгээний нөхцөл" : "Terms of Service", icon: ICON.terms },
    { href: "/profile/privacy", label: lang === "mn" ? "Нууцлалын бодлого"   : "Privacy Policy",   icon: ICON.privacy },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Хэрэглэгч карт */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-app">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-grad-brand flex items-center justify-center text-white font-bold text-xl">
            {(user.name ?? user.phone ?? "U")[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-app text-base font-bold truncate">{user.name ?? t("profile")}</p>
          <p className="text-muted text-sm truncate">{user.phone ?? user.email}</p>
        </div>
      </div>

      {/* БҮРТГЭЛ */}
      <Section title={lang === "mn" ? "Бүртгэл" : "Account"}>
        {ACCOUNT_MENU.map((m) => <Row key={m.href} item={m} />)}
      </Section>

      {/* ТУСЛАМЖ */}
      <Section title={lang === "mn" ? "Тусламж" : "Support"}>
        {SUPPORT_MENU.map((m) => <Row key={m.href} item={m} />)}
      </Section>

      {/* Гарах */}
      <button onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl bg-card border border-app text-[var(--danger)] font-semibold text-sm hover:bg-[var(--danger)]/10 transition-colors">
        {t("logout")}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────── helpers ────────────────────────────────────── */
interface MenuItem { href: string; label: string; icon: React.ReactNode }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-2 px-3">{title}</p>
      <div className="bg-card border border-app rounded-2xl overflow-hidden divide-y divide-app">
        {children}
      </div>
    </section>
  );
}

function Row({ item }: { item: MenuItem }) {
  return (
    <Link href={item.href}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-card-hover transition-colors">
      <div className="w-8 h-8 rounded-lg bg-elevated border border-app flex items-center justify-center text-sub shrink-0">
        {item.icon}
      </div>
      <span className="flex-1 text-[14px] font-medium text-app">{item.label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="text-muted shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </Link>
  );
}

/* ─────────────────────────────────────────── icons ─────────────────────────────────────── */
const ICON = {
  user: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  subscription: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="13" rx="2"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="3" y1="11" x2="21" y2="11"/>
    </svg>
  ),
  purchases: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  devices: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  help: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  terms: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  privacy: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
} as const;
