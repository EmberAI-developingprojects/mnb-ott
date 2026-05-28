"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, BundleItem, VodContent, PaginatedResponse } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

/* Admin-д duration format-ыг local-оор */
function formatDuration(s: number | null): string {
  if (!s || s < 0) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function BundleItemsPage() {
  useRoleGuard(["EDITOR", "ADMIN", "SUPER_ADMIN"]);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const confirmDialog = useConfirm();
  const [items, setItems] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [pickOpen, setPickOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<VodContent[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const r = await api.get<ApiResponse<BundleItem[]>>(`/api/admin/bundles/${id}/items`);
    setItems(r.data.data);
    setLoading(false);
  }

  async function searchVod() {
    setSearching(true);
    const r = await api.get<ApiResponse<PaginatedResponse<VodContent>>>("/api/admin/vod", {
      params: search ? { search, pageSize: 20 } : { pageSize: 20 },
    });
    const existingIds = new Set(items.map((i) => i.vodId));
    setResults(r.data.data.items.filter((v) => !existingIds.has(v.id)));
    setSearching(false);
  }

  async function addItem(vodId: string) {
    try {
      await api.post(`/api/admin/bundles/${id}/items`, { vodId });
      await load();
      await searchVod();
    } catch (e) {
      toast.error(getApiError(e).message);
    }
  }

  async function removeItem(vodId: string) {
    const ok = await confirmDialog({
      title: "Видеог багцаас хасах уу?",
      message: "Видео багцаас хасагдана. Худалдан авсан хэрэглэгчид түрээсээ үргэлжлүүлэх боломжтой.",
      tone: "warning",
      confirmLabel: "Хасах",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/bundles/${id}/items/${vodId}`);
      toast.success("Видео багцаас хасагдлаа");
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    }
  }

  return (
    <div>
      <button onClick={() => router.push("/bundles")}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={14} /> Багцууд руу буцах
      </button>

      <PageHeader
        title="Багц доторх видеонууд"
        subtitle={`${items.length} видео`}
        action={
          <Button onClick={() => { setPickOpen(true); searchVod(); }}>
            <Plus size={14} /> Видео нэмэх
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна...</p>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
          Багц хоосон. &quot;Видео нэмэх&quot; товчоор контент нэмнэ үү.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg shadow-card divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 px-4 py-3">
              {it.vod.thumbnailUrl && (
                <img src={it.vod.thumbnailUrl} alt="" className="w-20 h-12 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">{it.vod.title}</p>
                <p className="text-xs text-muted">{formatDuration(it.vod.duration)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(it.vodId)}>
                <X size={14} className="text-danger" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Vod picker modal */}
      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="Видео нэмэх" size="lg">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Гарчгаар хайх..." onKeyDown={(e) => { if (e.key === "Enter") searchVod(); }} />
            <Button onClick={searchVod} loading={searching}>Хайх</Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-border border border-border rounded-md">
            {results.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Боломжтой видео байхгүй</p>
            ) : results.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded" />}
                <p className="flex-1 text-sm text-fg truncate">{v.title}</p>
                <Button size="sm" onClick={() => addItem(v.id)}>Нэмэх</Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
