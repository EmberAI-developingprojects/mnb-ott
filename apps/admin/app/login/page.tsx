"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api, { getApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import type { ApiResponse, AdminUser } from "@/types";

const DEVICE = {
  deviceId: typeof window !== "undefined"
    ? (localStorage.getItem("admin-did") ?? crypto.randomUUID())
    : "admin",
  deviceName: "Admin Web",
  deviceType: "web",
};
if (typeof window !== "undefined") localStorage.setItem("admin-did", DEVICE.deviceId);

export default function LoginPage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const [identifier, setId]   = useState("");
  const [password, setPw]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (user && user.role !== "USER") router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setError(""); setLoading(true);
    try {
      const res = await api.post<ApiResponse<{ accessToken: string }>>("/api/auth/login", {
        emailOrPhone: identifier, password, ...DEVICE,
      });
      const me = await api.get<ApiResponse<AdminUser>>("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.data.accessToken}` },
      });

      /* USER role-той хэрэглэгчийг admin-аас татгалзана */
      if (me.data.data.role === "USER") {
        setError("Танд админ эрх байхгүй байна");
        setLoading(false);
        return;
      }

      setAuth(me.data.data, res.data.data.accessToken);
      router.push("/dashboard");
    } catch (e) {
      setError(getApiError(e).message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-sm p-8 space-y-6">
        <div>
          <div className="text-2xl font-black tracking-tight mb-1">
            <span className="text-danger">M</span>
            <span className="text-primary">N</span>
            <span className="text-danger">B</span>
            <span className="text-muted text-xs font-semibold ml-2 tracking-wider">ADMIN</span>
          </div>
          <p className="text-sm text-muted">МҮОНРТ OTT удирдлагын самбар</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Утас эсвэл и-мэйл">
            <Input type="text" value={identifier} onChange={(e) => setId(e.target.value)}
              placeholder="admin@mnb.mn / 99000000" autoFocus />
          </Field>

          <Field label="Нууц үг">
            <Input type="password" value={password} onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••" />
          </Field>

          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} disabled={!identifier || !password} className="w-full" size="lg">
            Нэвтрэх
          </Button>
        </form>

        <p className="text-[11px] text-muted text-center">
          Зөвхөн админ эрхтэй хэрэглэгчид нэвтрэх боломжтой
        </p>
      </div>
    </div>
  );
}
