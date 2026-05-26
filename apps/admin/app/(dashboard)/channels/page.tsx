"use client";

import { useEffect, useState } from "react";
import { Plus, Radio as RadioIcon, Tv as TvIcon, Wifi } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, Channel, ChannelKind } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { slugify } from "@/lib/slugify";
import { SectionCard } from "./_components/SectionCard";
import { LiveForm } from "./_components/LiveForm";
import { LiveBroadcastToggle } from "./_components/LiveBroadcastToggle";
import { ChannelTable } from "./_components/ChannelTable";
import {
  ChannelFormModal,
  LiveCreateModal,
  EMPTY_FORM,
  type ChannelFormData,
} from "./_components/ChannelFormModal";

/* /channels — 3 хэсэгтэй:
   1. LIVE — нэг бичлэг (МНБ үндсэн live), зөвхөн нэр + URL + on/off
   2. TV — олон суваг, full CRUD + thumbnail
   3. RADIO — олон радио, thumbnail хэрэгтэй */
export default function ChannelsPage() {
  const confirmDialog = useConfirm();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);

  /* Modal state — TV / RADIO / LIVE үүсгэх/засах */
  const [editing, setEditing]   = useState<Channel | null>(null);
  const [creating, setCreating] = useState<ChannelKind | null>(null);
  const [form, setForm]         = useState<ChannelFormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  /* Slug нь хэрэглэгчийн гараар оруулсан уу — оруулсан бол auto-update хийхгүй */
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<Channel[]>>("/api/admin/channels");
      setChannels(r.data.data);
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  /* Нэр оруулахад slug автомат шинэчлэх (хэрэв slug гараар бичээгүй бол) */
  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }
  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug }));
  }
  function handleFieldChange(patch: Partial<ChannelFormData>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function closeModal() {
    setCreating(null); setEditing(null);
  }

  function openCreate(kind: ChannelKind) {
    setForm({ ...EMPTY_FORM, orderIndex: String(channels.filter((c) => c.kind === kind).length) });
    setError(""); setSlugTouched(false); setCreating(kind);
  }

  function openEdit(c: Channel) {
    setForm({
      name: c.name, slug: c.slug,
      streamUrl:    c.streamUrl ?? "",
      thumbnailUrl: c.thumbnailUrl ?? "",
      isActive:     c.isActive,
      orderIndex:   c.orderIndex.toString(),
      price:        c.price?.toString() ?? "",
      /* datetime-local input нь "YYYY-MM-DDTHH:mm" формат шаардана */
      endsAt:       c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : "",
    });
    /* Засаж байгаа бол slug аль хэдийн бий — auto-overwrite хийхгүй */
    setError(""); setSlugTouched(true); setEditing(c);
  }

  /* Drag-drop reorder — нэг kind дотор шинэ дараалал тогтооно.
     Affected channel-уудын orderIndex-ийг параллел PATCH хийнэ. */
  async function handleReorder(reordered: Channel[]) {
    /* UI-ийг шууд optimistic update */
    setChannels((prev) => {
      const otherKinds = prev.filter((c) => c.kind !== reordered[0]?.kind);
      return [...otherKinds, ...reordered.map((c, i) => ({ ...c, orderIndex: i }))];
    });

    try {
      await Promise.all(
        reordered.map((c, i) =>
          c.orderIndex === i
            ? Promise.resolve()
            : api.patch(`/api/admin/channels/${c.id}`, { orderIndex: i }),
        ),
      );
      toast.success("Дараалал шинэчлэгдлээ");
    } catch (e) {
      toast.error(getApiError(e).message);
      await load();
    }
  }

  async function handleSave() {
    setError(""); setSaving(true);
    const kind: ChannelKind = editing?.kind ?? creating ?? "TV";
    /* price + endsAt нь зөвхөн LIVE-д хэрэглэгдэнэ — бусдад илгээхгүй */
    const liveExtra = kind === "LIVE"
      ? {
          price:  form.price ? Number(form.price) : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }
      : {};
    const payload = {
      name: form.name, slug: form.slug, kind,
      streamUrl:    form.streamUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      isActive:     form.isActive,
      orderIndex:   Number(form.orderIndex) || 0,
      ...liveExtra,
    };
    try {
      if (editing) await api.patch(`/api/admin/channels/${editing.id}`, payload);
      else         await api.post("/api/admin/channels", payload);
      closeModal();
      await load();
    } catch (e) { setError(getApiError(e).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(c: Channel) {
    const ok = await confirmDialog({
      title:   `"${c.name}"-ийг устгах уу?`,
      message: "Энэ үйлдлийг буцаах боломжгүй. Суваг устгагдсаны дараа холбогдох дамжуулалтын хаяг, хөтөлбөрийн хуваарь (EPG) устгагдана.",
      tone:    "danger",
      confirmLabel: "Устгах",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/channels/${c.id}`);
      toast.success(`"${c.name}" устгагдлаа`);
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    }
  }

  const live    = channels.find((c) => c.kind === "LIVE");
  const tvList  = channels.filter((c) => c.kind === "TV");
  const radList = channels.filter((c) => c.kind === "RADIO");

  const modalKind: ChannelKind = editing?.kind ?? creating ?? "TV";
  const tvRadioOpen = (creating === "TV" || creating === "RADIO") || (editing !== null && editing.kind !== "LIVE");
  const liveOpen    = creating === "LIVE" || (editing?.kind === "LIVE");

  return (
    <div>
      <PageHeader
        title="Дамжуулалт"
        subtitle="Шууд дамжуулалт, ТВ суваг, радио — нэгдсэн удирдлага"
      />

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна...</p>
      ) : (
        <div className="space-y-8">

          {/* ─── 1. LIVE ──────────────────────── */}
          <SectionCard
            icon={Wifi}
            title="LIVE — Үндсэн дамжуулалт"
            subtitle="Зөвхөн нэг бичлэг — нэр (тайлбар), HLS stream URL, унтраах/асаах"
            action={live && <LiveBroadcastToggle channel={live} onChanged={load} />}
          >
            {live ? (
              <LiveForm channel={live} onSaved={load} />
            ) : (
              <div className="flex items-center justify-between gap-4 p-3 bg-bg rounded-md">
                <p className="text-sm text-muted">LIVE бичлэг үүсээгүй байна.</p>
                <Button size="sm" onClick={() => openCreate("LIVE")}>
                  <Plus size={14} /> LIVE үүсгэх
                </Button>
              </div>
            )}
          </SectionCard>

          {/* ─── 2. TV сувгууд ────────────────── */}
          <SectionCard
            collapsible
            icon={TvIcon}
            title={`Сувгууд (${tvList.length})`}
            subtitle="TV сувгууд — нэмэх, хасах, эрэмбэлэх, stream URL засах"
            action={<Button size="sm" onClick={() => openCreate("TV")}><Plus size={14} /> Шинэ суваг</Button>}
          >
            {tvList.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Суваг байхгүй</p>
            ) : (
              <ChannelTable items={tvList} onEdit={openEdit} onDelete={handleDelete} onReorder={handleReorder} showThumb />
            )}
          </SectionCard>

          {/* ─── 3. Радио ─────────────────────── */}
          <SectionCard
            collapsible
            icon={RadioIcon}
            title={`Радио (${radList.length})`}
            subtitle="Радио сувгууд — thumbnail заавал хэрэгтэй"
            action={<Button size="sm" onClick={() => openCreate("RADIO")}><Plus size={14} /> Шинэ радио</Button>}
          >
            {radList.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Радио байхгүй</p>
            ) : (
              <ChannelTable items={radList} onEdit={openEdit} onDelete={handleDelete} onReorder={handleReorder} showThumb />
            )}
          </SectionCard>
        </div>
      )}

      <ChannelFormModal
        open={tvRadioOpen}
        kind={modalKind}
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

      <LiveCreateModal
        open={liveOpen}
        form={form}
        error={error}
        saving={saving}
        onClose={closeModal}
        onSave={handleSave}
        onFieldChange={handleFieldChange}
      />
    </div>
  );
}
