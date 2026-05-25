"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, Ban, CheckCircle2 } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, UserDetail, Role } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  USER: "Хэрэглэгч", EDITOR: "Эдитор", OPERATOR: "Оператор",
  ADMIN: "Админ", SUPER_ADMIN: "Супер админ",
};

const ROLE_RANK: Record<Role, number> = {
  USER: 0, EDITOR: 1, OPERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3,
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuthStore();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Role modal */
  const [roleOpen, setRoleOpen]   = useState(false);
  const [newRole, setNewRole]     = useState<Role>("USER");
  const [roleSaving, setRoleSaving] = useState(false);

  /* Ban modal */
  const [banOpen, setBanOpen]     = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banSaving, setBanSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await api.get<ApiResponse<UserDetail>>(`/api/admin/users/${id}`);
      setUser(r.data.data);
      setNewRole(r.data.data.role);
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSave() {
    setRoleSaving(true);
    try {
      await api.patch(`/api/admin/users/${id}/role`, { role: newRole });
      setRoleOpen(false);
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleBanToggle(blocked: boolean) {
    if (blocked && !banReason.trim()) {
      toast.warning("Шалтгаан бичнэ үү");
      return;
    }
    setBanSaving(true);
    try {
      await api.patch(`/api/admin/users/${id}/block`, { blocked, reason: banReason });
      setBanOpen(false); setBanReason("");
      toast.success(blocked ? "Хэрэглэгч блок хийгдлээ" : "Блок арилгагдлаа");
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setBanSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Уншиж байна...</p>;
  if (error)   return <p className="text-sm text-danger">{error}</p>;
  if (!user || !me) return null;

  /* Хэрэглэгч өөрөөсөө дээш role-той бол эрх өөрчилж чадахгүй */
  const canManage = me.id !== user.id && ROLE_RANK[user.role] < ROLE_RANK[me.role];
  /* Боломжтой role сонголтууд — өөрийнхөөсөө доош */
  const allowedRoles = (Object.keys(ROLE_LABEL) as Role[])
    .filter((r) => ROLE_RANK[r] < ROLE_RANK[me.role]);

  return (
    <div>
      <button onClick={() => router.push("/users")}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={14} />
        Хэрэглэгчдийн жагсаалт
      </button>

      <PageHeader
        title={user.name ?? user.email ?? user.phone ?? "Хэрэглэгч"}
        /* Хэрэв title нэр бол subtitle нь холбоо; нэр байхгүй бол subtitle хоосон */
        subtitle={user.name ? (user.email ?? user.phone ?? undefined) : undefined}
        action={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRoleOpen(true)}>
                <Shield size={14} /> Роль өөрчлөх
              </Button>
              {user.isBlocked ? (
                <Button variant="outline" size="sm" onClick={() => handleBanToggle(false)} loading={banSaving}>
                  <CheckCircle2 size={14} /> Сэргээх
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setBanOpen(true)}>
                  <Ban size={14} /> Блок хийх
                </Button>
              )}
            </div>
          ) : me.id === user.id ? (
            <span className="text-xs text-muted">Та өөрийнхөө эрхийг өөрчилж чадахгүй</span>
          ) : (
            <span className="text-xs text-muted">Танаас өндөр зэрэглэлтэй</span>
          )
        }
      />

      {/* Profile section */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <InfoCard title="Үндсэн мэдээлэл">
          <Row label="Нэр">{user.name ?? "—"}</Row>
          <Row label="И-мэйл">{user.email ?? "—"}</Row>
          <Row label="Утас">{user.phone ?? "—"}</Row>
          <Row label="Роль">
            <Badge tone={user.role === "USER" ? "neutral" : "primary"}>{ROLE_LABEL[user.role]}</Badge>
          </Row>
          <Row label="Төлөв">
            {user.isBlocked
              ? <Badge tone="danger">Блоктой</Badge>
              : user.isVerified
                ? <Badge tone="success">Идэвхтэй</Badge>
                : <Badge tone="warning">Баталгаажаагүй</Badge>
            }
          </Row>
          <Row label="Бүртгүүлсэн">{formatDateTime(user.createdAt)}</Row>
        </InfoCard>

        <InfoCard title="Захиалга">
          {user.subscription ? (
            <>
              <Row label="Багц"><Badge tone="primary">{user.subscription.planType}</Badge></Row>
              <Row label="Төлөв">{user.subscription.status}</Row>
              <Row label="Эхэлсэн">{formatDate(user.subscription.startedAt)}</Row>
              <Row label="Дуусах">{user.subscription.expiresAt ? formatDate(user.subscription.expiresAt) : "—"}</Row>
            </>
          ) : (
            <p className="text-sm text-muted">Захиалгагүй</p>
          )}
        </InfoCard>
      </div>

      {/* Sessions */}
      <InfoCard title={`Идэвхтэй төхөөрөмж (${user.sessions.length})`} className="mb-6">
        {user.sessions.length === 0 ? (
          <p className="text-sm text-muted">Идэвхтэй төхөөрөмж байхгүй</p>
        ) : (
          <div className="space-y-2">
            {user.sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-fg">{s.deviceName}</p>
                  <p className="text-xs text-muted">{s.deviceType}</p>
                </div>
                <p className="text-xs text-muted">{formatDateTime(s.lastActive)}</p>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Payments */}
      <InfoCard title={`Төлбөрийн түүх (${user.payments.length})`} className="mb-6">
        {user.payments.length === 0 ? (
          <p className="text-sm text-muted">Гүйлгээ байхгүй</p>
        ) : (
          <div className="space-y-1">
            {user.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-fg">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-muted">{p.invoiceId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={p.status === "PAID" ? "success" : p.status === "REFUNDED" ? "warning" : "neutral"}>
                    {p.status}
                  </Badge>
                  <p className="text-xs text-muted">{formatDateTime(p.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Purchases */}
      <InfoCard title={`Видео худалдан авалт (${user.purchases.length})`}>
        {user.purchases.length === 0 ? (
          <p className="text-sm text-muted">Худалдан авалт байхгүй</p>
        ) : (
          <div className="space-y-1">
            {user.purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-fg">{p.vod.title}</p>
                  <p className="text-xs text-muted">
                    {formatDate(p.createdAt)} · {formatCurrency(p.amount)}
                  </p>
                </div>
                <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Role modal */}
      <Modal open={roleOpen} onClose={() => setRoleOpen(false)} title="Роль өөрчлөх">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Та <strong className="text-fg">{user.name ?? "энэ хэрэглэгч"}</strong>-ийн ролыг өөрчилж байна.
          </p>
          <Field label="Шинэ роль">
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full h-9 px-3 rounded-md text-sm bg-surface border border-border focus:outline-none focus:border-primary">
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRoleOpen(false)}>Болих</Button>
            <Button onClick={handleRoleSave} loading={roleSaving} disabled={newRole === user.role}>
              Хадгалах
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ban modal */}
      <Modal open={banOpen} onClose={() => setBanOpen(false)} title="Хэрэглэгчийг блок хийх">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Блок хийсний дараа хэрэглэгч нэвтэрч чадахгүй болно. Бүх идэвхтэй төхөөрөмж салгагдана.
          </p>
          <Field label="Шалтгаан (заавал)">
            <Input value={banReason} onChange={(e) => setBanReason(e.target.value)}
              placeholder="Жишээ: спам үйлдэл" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setBanOpen(false)}>Болих</Button>
            <Button variant="danger" onClick={() => handleBanToggle(true)} loading={banSaving}>
              Блок хийх
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-lg shadow-card p-5 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold text-fg mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-fg">{children}</span>
    </div>
  );
}
