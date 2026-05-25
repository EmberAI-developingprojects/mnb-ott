"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, PaginatedResponse, VodContent } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { formatDate, formatCurrency } from "@/lib/utils";
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
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    const r = await api.get<ApiResponse<PaginatedResponse<VodContent>>>("/api/admin/vod", { params });
    setData(r.data.data);
    setLoading(false);
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
        <div className="bg-surface border border-border rounded-lg shadow-card p-12 text-center text-sm text-muted">
          Уншиж байна...
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="Видео байхгүй байна" />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Видео</TH>
              <TH>Төрөл</TH>
              <TH>Категори</TH>
              <TH>Үнэ</TH>
              <TH>Худалдан авалт</TH>
              <TH>Төлөв</TH>
              <TH>Огноо</TH>
              <TH className="text-right">Үйлдэл</TH>
            </THead>
            <TBody>
              {data.items.map((v) => (
                <TR key={v.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      {v.thumbnailUrl && (
                        <img src={v.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded" />
                      )}
                      <p className="font-medium text-fg line-clamp-1">{v.title}</p>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={v.type === "PREMIUM" ? "primary" : "neutral"}>
                      {v.type === "PREMIUM" ? "Видео сан" : "Архив"}
                    </Badge>
                  </TD>
                  <TD className="text-muted text-xs">{v.genre ?? "—"}</TD>
                  <TD>{v.price ? formatCurrency(v.price) : <span className="text-muted">Үнэгүй</span>}</TD>
                  <TD className="text-muted">{v._count?.purchases ?? 0}</TD>
                  <TD>
                    <Badge tone={v.isActive ? "success" : "neutral"}>
                      {v.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                  </TD>
                  <TD className="text-muted text-xs">{formatDate(v.createdAt)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v)}>
                        <Trash2 size={14} className="text-danger" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
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
