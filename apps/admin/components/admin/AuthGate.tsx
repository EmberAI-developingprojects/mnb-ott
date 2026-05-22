"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types";

/* Sidebar layout-ын дотор зөвхөн нэвтэрсэн EDITOR+ хэрэглэгчдийг л оруулна.
   USER эсвэл нэвтрээгүй → /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role === "USER") router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user || user.role === "USER") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        Уншиж байна...
      </div>
    );
  }

  return <>{children}</>;
}

/* Per-page role guard hook. Хуудасны эхэнд ашиглана.
   Зөвшөөрөгдөөгүй role-той бол fallback хуудас руу redirect. */
export function useRoleGuard(allowed: Role[], fallback = "/") {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    if (!allowed.includes(user.role)) router.replace(fallback);
  }, [user, allowed, fallback, router]);
}
