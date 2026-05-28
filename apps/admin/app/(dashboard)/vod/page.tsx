"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, ImageOff } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, PaginatedResponse, VodContent } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { VodType } from "@/types";

interface FormData {
  title: string;
  description: string;
  thumbnailUrl: string;
  genre: string;
  type: VodType;
  price: string;
  duration: string;
  youtubeId: string;
}

const EMPTY_FORM: FormData = {
  title: "", description: "", thumbnailUrl: "", genre: "", type: "FREE",
  price: "", duration: "", youtubeId: "",
};

export default function VodPage() {
  useRoleGuard(["EDITOR", "ADMIN", "SUPER_ADMIN"]);
  const confirmDialog = useConfirm();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | VodType>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<VodContent> | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<VodContent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [search, typeFilter, page]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const r = await api.get<ApiResponse<PaginatedResponse<VodContent>>>("/api/admin/vod", { params });
      setData(r.data.data);
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM); setError(""); setCreating(true);
  }

  function openEdit(v: VodContent) {
    setForm({
      title:        v.title,
      description:  v.description ?? "",
      thumbnailUrl: v.thumbnailUrl ?? "",
      genre:        v.genre ?? "",
      type:         v.type,
      price:        v.price?.toString() ?? "",
      duration:     v.duration?.toString() ?? "",
      youtubeId:    v.sources?.find((s) => s.youtubeId)?.youtubeId ?? "",
    });
    setError("");
    setEditing(v);
  }

  async function handleSave() {
    setError(""); setSaving(true);
    const payload = {
      title: form.title,
      description:  form.description || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      genre:        form.genre || undefined,
      type:         form.type,
      price:        form.price ? Number(form.price) : undefined,
      duration:     form.duration ? Number(form.duration) : undefined,
      youtubeId:    form.youtubeId || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/api/admin/vod/${editing.id}`, payload);
      } else {
        await api.post("/api/admin/vod", payload);
      }
      setEditing(null); setCreating(false);
      await load();
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: VodContent) {
    const ok = await confirmDialog({
      title: `"${v.title}"-ийг устгах уу?`,
      message: "Энэ үйлдлийг буцаах боломжгүй. Холбогдох худалдан авалт, түүх алга болно.",
      tone: "danger",
      confirmLabel: "Устгах",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/vod/${v.id}`);
      toast.success(`"${v.title}" устгагдлаа`);
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const isOpen = creating || editing !== null;

  return (
    <div>
      <PageHeader
        title="Видео контент"
        subtitle={
          typeFilter === "FREE"
            ? "Архив — YouTube видео, бүх plan-д үнэгүй"
            : typeFilter === "PREMIUM"
              ? "Видео сан — VOD/COMBO багцаар үзэх премиум контент"
              : (data ? `Нийт ${data.total.toLocaleString("mn-MN")} видео (Архив + Видео сан)` : "")
        }
        action={<Button onClick={openCreate}><Plus size={14} /> Шинэ видео</Button>}
      />

      {/* Type filter — Архив / Видео сан / Бүгд */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { v: "",        label: "Бүгд" },
          { v: "FREE",    label: "Архив (YouTube)" },
          { v: "PREMIUM", label: "Видео сан (Премиум)" },
        ] as const).map((opt) => (
          <button key={opt.v} onClick={() => { setTypeFilter(opt.v as VodType | ""); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              typeFilter === opt.v
                ? "bg-primary text-white border-primary"
                : "bg-surface border-border text-fg hover:bg-bg"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input placeholder="Гарчгаар хайх..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="aspect-video bg-bg animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 bg-bg rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-bg rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="Видео байхгүй байна" />
      ) : (
        <>
          {/* Card grid layout — thumbnail-тэй ойлгомжтой */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((v) => (
              <article key={v.id}
                className="group bg-surface border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">

                {/* Thumbnail */}
                <div className="relative aspect-video bg-bg">
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt={v.title}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <ImageOff size={28} aria-hidden="true" />
                    </div>
                  )}
                  {/* Type badge — Архив / Сан */}
                  <span className={cn(
                    "absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    v.type === "PREMIUM"
                      ? "bg-primary text-white"
                      : "bg-black/70 text-white",
                  )}>
                    {v.type === "PREMIUM" ? "Сан" : "Архив"}
                  </span>
                  {/* Inactive overlay */}
                  {!v.isActive && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold uppercase tracking-wider">Идэвхгүй</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-fg line-clamp-2 leading-snug min-h-[40px]">
                    {v.title}
                  </h3>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span className="truncate">{v.genre ?? "—"}</span>
                    <span className="tabular-nums">{formatDate(v.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <div className="text-[11px] text-muted">
                      {v.price && v.price > 0 ? (
                        <span className="text-fg font-semibold">{formatCurrency(v.price)}</span>
                      ) : (
                        <span>Үнэгүй</span>
                      )}
                      <span className="mx-1.5">·</span>
                      <span className="tabular-nums">{v._count?.purchases ?? 0} худ.</span>
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)} title="Засах">
                        <Edit size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} title="Устгах">
                        <Trash2 size={13} className="text-danger" />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm">
              <span className="text-muted">Хуудас {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Өмнөх</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Дараах</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={isOpen} onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Видео засах" : "Шинэ видео нэмэх"} size="lg">
        <div className="space-y-4">

          {/* Контентийн төрөл сонголт — хамгийн чухал тул эхэнд */}
          <Field
            label="Контентийн төрөл (заавал)"
            hint="Архив — YouTube архив (бүх plan-д үнэгүй). Видео сан — VOD/COMBO багцаар л үзнэ."
          >
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, type: "FREE" })}
                className={`p-3 rounded-md border text-left transition-colors ${
                  form.type === "FREE"
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface hover:bg-bg"
                }`}>
                <p className="text-sm font-semibold text-fg">Архив</p>
                <p className="text-xs text-muted mt-0.5">YouTube архивын бичлэг — бүх plan үзнэ</p>
              </button>
              <button type="button" onClick={() => setForm({ ...form, type: "PREMIUM" })}
                className={`p-3 rounded-md border text-left transition-colors ${
                  form.type === "PREMIUM"
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface hover:bg-bg"
                }`}>
                <p className="text-sm font-semibold text-fg">Видео сан</p>
                <p className="text-xs text-muted mt-0.5">Премиум контент — VOD/COMBO багцаар</p>
              </button>
            </div>
          </Field>

          <Field label="Гарчиг (заавал)">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Тайлбар">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Категори">
              <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder="Кино, Хүүхэд, Спорт..." />
            </Field>
            <Field label="YouTube ID">
              <Input value={form.youtubeId} onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
                placeholder="dQw4w9WgXcQ" />
            </Field>
          </div>
          <Field label="Thumbnail URL">
            <Input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              placeholder="https://..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Үнэ (₮)"
              hint={form.type === "PREMIUM" ? "VOD/COMBO багцгүй хэрэглэгч тусад нь түрээслэх үнэ" : "Архив видеонд үнэ хэрэггүй"}
            >
              <Input type="number" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0 = үнэгүй"
                disabled={form.type === "FREE"} />
            </Field>
            <Field label="Үргэлжлэх хугацаа (сек)">
              <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </Field>
          </div>
          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setCreating(false); setEditing(null); }}>Болих</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
              {editing ? "Хадгалах" : "Үүсгэх"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
