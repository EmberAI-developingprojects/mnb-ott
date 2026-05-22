"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Film, Tv, Package, CreditCard,
  Bell, Settings, Shield, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Array<"EDITOR" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN">;
}

const NAV: NavItem[] = [
  { href: "/dashboard",     label: "Тойм",            icon: LayoutDashboard, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/users",         label: "Хэрэглэгчид",    icon: Users,           roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/vod",           label: "Видео (Архив + Сан)", icon: Film,        roles: ["EDITOR", "ADMIN", "SUPER_ADMIN"] },
  { href: "/channels",      label: "Live сувгууд",   icon: Tv,              roles: ["EDITOR", "OPERATOR", "ADMIN", "SUPER_ADMIN"] },
  { href: "/bundles",       label: "Видео багц",     icon: Package,         roles: ["EDITOR", "ADMIN", "SUPER_ADMIN"] },
  { href: "/payments",      label: "Төлбөр",          icon: CreditCard,      roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/notifications", label: "Мэдэгдэл",       icon: Bell,            roles: ["EDITOR", "ADMIN", "SUPER_ADMIN"] },
  { href: "/audit",         label: "Үйлдлийн түүх",  icon: Shield,          roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/config",        label: "Системийн тохиргоо", icon: Settings,    roles: ["ADMIN", "SUPER_ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();

  async function handleLogout() {
    try { await api.post("/api/auth/logout"); } catch { /* silent */ }
    clearAuth();
    router.push("/login");
  }

  if (!user) return null;

  /* USER role-той админ нэвтрэх боломжгүй — нэг ч nav харагдахгүй */
  const visible = NAV.filter((n) =>
    user.role !== "USER" && (n.roles as readonly string[]).includes(user.role),
  );

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-lg font-black tracking-tight">
          <span className="text-danger">M</span>
          <span className="text-primary">N</span>
          <span className="text-danger">B</span>
          <span className="text-white/60 text-xs font-semibold ml-2 tracking-wider">ADMIN</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {visible.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-sidebar-hover hover:text-white",
              )}>
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        <div className="px-2 text-xs text-white/60">
          <p className="text-white font-medium truncate">{user.name ?? user.email ?? user.phone}</p>
          <p className="mt-0.5 uppercase tracking-wider">{user.role}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-white/70 hover:bg-sidebar-hover hover:text-white transition-colors">
          <LogOut size={14} />
          Гарах
        </button>
      </div>
    </aside>
  );
}
