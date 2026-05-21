"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { ApiResponse, User } from "@/types";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken  = params.get("accessToken");
    const callbackUrl  = params.get("callbackUrl") ?? "/";
    const error        = params.get("error");

    if (error) { router.replace(`/login?error=${encodeURIComponent(error)}`); return; }
    if (!accessToken) { router.replace("/login"); return; }

    api.get<ApiResponse<User>>("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => {
      setAuth(r.data.data, accessToken);
      router.replace(callbackUrl);
    }).catch(() => router.replace("/login"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[var(--border-strong)] border-t-[#0046A5] rounded-full animate-spin" />
        <p className="text-muted text-sm">Нэвтэрч байна...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return <Suspense><CallbackContent /></Suspense>;
}
