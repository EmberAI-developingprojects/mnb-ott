"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Radio as RadioIcon, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, Channel } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { slugify } from "@/lib/slugify";
import { LiveEventTable } from "./_components/LiveEventTable";
import { LiveEventFormModal, EMPTY_FORM, type LiveFormData } from "./_components/LiveEventFormModal";

/* /admin/live — LIVE event PPV-ийн тусгай удирдлага.
   3 хэсэгт хуваагдана:
     Одоо явагдаж буй — startsAt <= now < endsAt
     Удахгүй болох    — startsAt > now
     ✓ Дууссан          — endsAt <= now
   Overlap detection: одоогийн + ирээдүйн event-уудын цаг давхцаж байвал
   warning banner харагдана (нэг үед хоёр LIVE дамжуулагдах нь буруу). */

type EventStatus = "live" | "upcoming" | "past";

interface CategorizedEvents {
  live:     Channel[];
  upcoming: Channel[];
  past:     Channel[];
}

function categorize(events: Channel[], now: number): CategorizedEvents {
  const live:     Channel[] = [];
  const upcoming: Channel[] = [];
  const past:     Channel[] = [];

  for (const e of events) {
    const starts = e.startsAt ? new Date(e.startsAt).getTime() : null;
    const ends   = e.endsAt   ? new Date(e.endsAt).getTime()   : null;

    /* startsAt + endsAt бүхэн null: ямар нэгэн "явагдаж буй" гэж үзнэ */
    if (starts === null && ends === null)              { live.push(e); continue; }
    /* startsAt байхгүй, endsAt ирээдүйд: явагдаж буй */
    if (starts === null && ends !== null && ends > now)    { live.push(e); continue; }
    /* endsAt өнгөрсөн: past */
    if (ends !== null && ends <= now)                  { past.push(e); continue; }
    /* startsAt ирээдүйд: upcoming */
    if (starts !== null && starts > now)               { upcoming.push(e); continue; }
    /* startsAt өнгөрсөн, endsAt ирээдүйд: явагдаж буй */
    live.push(e);
  }

  past.sort((a, b)     => new Date(b.endsAt   ?? 0).getTime() - new Date(a.endsAt   ?? 0).getTime());
  upcoming.sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime());

  return { live, upcoming, past };
}

/* Overlap detect — startsAt..endsAt range-ууд давхцаж байгаа эсэхийг шалгах.
   Зөвхөн live + upcoming event-уудад л үйлчилнэ (past давхцсан ч асуудал биш).
   Хэдэн pair давхцаж байгааг буцаана. */
function findOverlaps(events: Channel[]): Array<[Channel, Channel]> {
  const overlaps: Array<[Channel, Channel]> = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      const aStart = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const aEnd   = a.endsAt   ? new Date(a.endsAt).getTime()   : Number.POSITIVE_INFINITY;
      const bStart = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      const bEnd   = b.endsAt   ? new Date(b.endsAt).getTime()   : Number.POSITIVE_INFINITY;
      if (aStart < bEnd && bStart < aEnd) overlaps.push([a, b]);
    }
  }
  return overlaps;
}

export default function LivePage() {
  useRoleGuard(["EDITOR", "OPERATOR", "ADMIN", "SUPER_ADMIN"]);
  const confirmDialog = useConfirm();
  const [events, setEvents] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Channel | null>(null);
  const [form, setForm]         = useState<LiveFormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  /* "Одоо явагдаж буй" хэсгийн countdown 1с тутамд шинэчлэхэд хэрэгтэй */
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<Channel[]>>("/api/admin/channels");
      /* Зөвхөн LIVE kind-ийг авна */
      setEvents(r.data.data.filter((c) => c.kind === "LIVE"));
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  const { live: liveNow, upcoming, past } = useMemo(
    () => categorize(events, now),
    [events, now],
  );

  /* Overlap зөвхөн идэвхтэй + ирээдүйн event-уудад үйлчилнэ */
  const overlaps = useMemo(() => findOverlaps([...liveNow, ...upcoming]), [liveNow, upcoming]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, orderIndex: String(events.length) });
    setError(""); setSlugTouched(false); setCreating(true);
  }

  function openEdit(e: Channel) {
    setForm({
      name:         e.name,
      slug:         e.slug,
      streamUrl:    e.streamUrl ?? "",
      thumbnailUrl: e.thumbnailUrl ?? "",
      isActive:     e.isActive,
      orderIndex:   e.orderIndex.toString(),
      price:        e.price?.toString() ?? "",
      startsAt:     e.startsAt ? toLocalInput(e.startsAt) : "",
      endsAt:       e.endsAt   ? toLocalInput(e.endsAt)   : "",
    });
    setError(""); setSlugTouched(true); setEditing(e);
  }

  function closeModal() {
    setCreating(false); setEditing(null);
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }
  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug }));
  }
  function handleFieldChange(patch: Partial<LiveFormData>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSave() {
    setError(""); setSaving(true);
    const payload = {
      name:         form.name,
      slug:         form.slug,
      kind:         "LIVE" as const,
      streamUrl:    form.streamUrl    || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      isActive:     form.isActive,
      orderIndex:   Number(form.orderIndex) || 0,
      price:        form.price ? Number(form.price) : null,
      startsAt:     form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt:       form.endsAt   ? new Date(form.endsAt).toISOString()   : null,
    };

    /* Client-side validation: startsAt < endsAt */
    if (payload.startsAt && payload.endsAt && new Date(payload.startsAt) >= new Date(payload.endsAt)) {
      setError("Эхлэх хугацаа дуусах хугацааны өмнө байх ёстой");
      setSaving(false);
      return;
    }

    try {
      if (editing) await api.patch(`/api/admin/channels/${editing.id}`, payload);
      else         await api.post("/api/admin/channels", payload);
      toast.success(editing ? "Шинэчлэгдлээ" : "LIVE event үүсгэгдлээ");
      closeModal();
      await load();
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Channel) {
    const ok = await confirmDialog({
      title:   `"${e.name}"-ийг устгах уу?`,
      message: "Энэ LIVE event-ийг устгана. Худалдан авсан хэрэглэгчдийн бүртгэл хэвээр үлдэнэ. Буцаах боломжгүй.",
      tone:    "danger",
      confirmLabel: "Устгах",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/channels/${e.id}`);
      toast.success(`"${e.name}" устгагдлаа`);
      await load();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="LIVE event"
        subtitle="Тусдаа худалдан авдаг (PPV) шууд дамжуулалт — спорт, концерт, тусгай эвент"
      />

      {/* Overlap warning banner — CLAUDE.md: амбер биш, danger улаан ашиглана */}
      {overlaps.length > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-danger/40 bg-danger/10">
          <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-danger">Цаг давхцсан event илэрсэн ({overlaps.length})</p>
            <ul className="mt-1.5 space-y-0.5 text-fg/80">
              {overlaps.map(([a, b], i) => (
                <li key={i}>• &ldquo;{a.name}&rdquo; ↔ &ldquo;{b.name}&rdquo; — цаг давхцаж байна</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Нэг үед олон LIVE дамжуулагдвал хэрэглэгчид зөвхөн нэгийг л харах боломжтой. Цагийг засна уу.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна...</p>
      ) : (
        <div className="space-y-8">

          {/* ─── 1. Одоо явагдаж байгаа ──────────────────────── */}
          <SectionHeader
            status="live"
            count={liveNow.length}
            action={<Button size="sm" onClick={openCreate}><Plus size={14} /> Шинэ LIVE event</Button>}
          />
          {liveNow.length === 0 ? (
            <EmptyState message="Одоогоор явагдаж буй LIVE event байхгүй" />
          ) : (
            <LiveEventTable events={liveNow} status="live" now={now} onEdit={openEdit} onDelete={handleDelete} />
          )}

          {/* ─── 2. Удахгүй болох ────────────────────────────── */}
          <SectionHeader status="upcoming" count={upcoming.length} />
          {upcoming.length === 0 ? (
            <EmptyState message="Удахгүй болох LIVE event байхгүй" />
          ) : (
            <LiveEventTable events={upcoming} status="upcoming" now={now} onEdit={openEdit} onDelete={handleDelete} />
          )}

          {/* ─── 3. Дууссан ──────────────────────────────────── */}
          <SectionHeader status="past" count={past.length} />
          {past.length === 0 ? (
            <EmptyState message="Дууссан LIVE event байхгүй" />
          ) : (
            <LiveEventTable events={past} status="past" now={now} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      )}

      <LiveEventFormModal
        open={creating || editing !== null}
        editing={!!editing}
        form={form}
        error={error}
        saving={saving}
        onClose={closeModal}
        onSave={handleSave}
        onNameChange={handleNameChange}
        onSlugChange={handleSlugChange}
        onFieldChange={handleFieldChange}
      />
    </div>
  );
}

/* datetime-local input нь "YYYY-MM-DDTHH:mm" формат шаардана */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SectionHeader({ status, count, action }: { status: EventStatus; count: number; action?: React.ReactNode }) {
  const cfg = {
    live:     { icon: RadioIcon,     color: "text-red-500",   title: "Одоо явагдаж байна" },
    upcoming: { icon: Clock,         color: "text-blue-500",  title: "Удахгүй болох" },
    past:     { icon: CheckCircle2,  color: "text-muted",     title: "Дууссан" },
  }[status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Icon size={18} className={cfg.color} />
        <h2 className="text-sm font-bold text-app">{cfg.title}</h2>
        <span className="text-xs text-muted px-1.5 py-0.5 rounded bg-bg-elevated">{count}</span>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="p-6 text-center text-sm text-muted bg-bg rounded-md">{message}</p>;
}
