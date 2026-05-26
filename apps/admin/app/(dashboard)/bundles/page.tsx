"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, VodBundle } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

interface FormData {
  title: string; description: string; thumbnailUrl: string;
  isActive: boolean; orderIndex: string;
}

const EMPTY_FORM: FormData = {
  title: "", description: "", thumbnailUrl: "", isActive: true, orderIndex: "0",
};

export default function BundlesPage() {
  const confirmDialog = useConfirm();
  const [bundles, setBundles] = useState<VodBundle[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing]   = useState<VodBundle | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<VodBundle[]>>("/api/admin/bundles");
      setBundles(r.data.data);
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() { setForm(EMPTY_FORM); setError(""); setCreating(true); }
  function openEdit(b: VodBundle) {
    setForm({
      title: b.title,
      description:  b.description ?? "",
      thumbnailUrl: b.thumbnailUrl ?? "",
      isActive:     b.isActive,
      orderIndex:   b.orderIndex.toString(),
    });
    setError(""); setEditing(b);
  }

  async function handleSave() {
    setError(""); setSaving(true);
    const payload = {
      title: form.title,
      description:  form.description || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      isActive:     form.isActive,
      orderIndex:   Number(form.orderIndex) || 0,
    };
    try {
      if (editing) await api.patch(`/api/admin/bundles/${editing.id}`, payload);
      else         await api.post("/api/admin/bundles", payload);
      setEditing(null); setCreating(false);
      await load();
    } catch (e) { setError(getApiError(e).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(b: VodBundle) {
    const ok = await confirmDialog({
      title: `"${b.title}" багцыг устгах уу?`,
      message: "Багцыг устгахад доторх видеоны холбоосууд сэргээгдэхгүй. Худалдан авсан хэрэглэгчид түрээсээ дуустал үзэх боломжтой хэвээр.",
      tone: "danger",
      confirmLabel: "Устгах",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/bundles/${b.id}`);
      toast.success(`"${b.title}" багц устгагдлаа`);
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    }
  }

  const isOpen = creating || editing !== null;

  return (
    <div>
      <PageHeader
        title="Видео багц"
        subtitle="Тематик цуглуулга — багц доторх видеог тус бүрчлэн 72 цагаар түрээслэнэ"
        action={<Button onClick={openCreate}><Plus size={14} /> Шинэ багц</Button>}
      />

      {loading ? (
        <div className="bg-surface border border-border rounded-lg shadow-card p-12 text-center text-sm text-muted">
          Уншиж байна...
        </div>
      ) : bundles.length === 0 ? (
        <EmptyState message="Багц байхгүй" />
      ) : (
        <Table>
          <THead>
            <TH>#</TH>
            <TH>Багц</TH>
            <TH>Видео</TH>
            <TH>Төлөв</TH>
            <TH className="text-right">Үйлдэл</TH>
          </THead>
          <TBody>
            {bundles.map((b) => (
              <TR key={b.id}>
                <TD className="text-muted">{b.orderIndex}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    {b.thumbnailUrl && (
                      <img src={b.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded" />
                    )}
                    <div>
                      <p className="font-medium text-fg">{b.title}</p>
                      {b.description && <p className="text-xs text-muted line-clamp-1">{b.description}</p>}
                    </div>
                  </div>
                </TD>
                <TD className="text-muted">{b._count?.items ?? 0}</TD>
                <TD>
                  <Badge tone={b.isActive ? "success" : "neutral"}>
                    {b.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/bundles/${b.id}`}>
                      <Button variant="ghost" size="sm">Видеонууд</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={isOpen} onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Багц засах" : "Шинэ багц"}>
        <div className="space-y-4">
          <Field label="Гарчиг (заавал)">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Тайлбар">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </Field>
          <Field label="Thumbnail URL">
            <Input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
          </Field>
          <Field
            label="Харагдах дараалал"
            hint="Бага дугаар нь эхэнд харагдана (0 = эхний байр)."
          >
            <Input type="number" value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: e.target.value })} />
          </Field>
          <Toggle
            checked={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
            label="Багцын төлөв"
            onLabel="Идэвхтэй"
            offLabel="Унтраалттай"
          />
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
