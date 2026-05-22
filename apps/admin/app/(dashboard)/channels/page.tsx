"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Radio as RadioIcon, Tv as TvIcon, Wifi, GripVertical } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, Channel, ChannelKind } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";

/* /channels — 3 хэсэгтэй:
   1. LIVE — нэг бичлэг (МНБ үндсэн live), зөвхөн нэр + URL + on/off
   2. TV — олон суваг, full CRUD + thumbnail
   3. RADIO — олон радио, thumbnail хэрэгтэй */

interface FormData {
  name: string;
  slug: string;
  streamUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
  orderIndex: string;
}

const EMPTY_FORM: FormData = {
  name: "", slug: "", streamUrl: "", thumbnailUrl: "", isActive: true, orderIndex: "0",
};

export default function ChannelsPage() {
  const confirmDialog = useConfirm();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);

  /* Modal state — TV / RADIO үүсгэх/засах */
  const [editing, setEditing]   = useState<Channel | null>(null);
  const [creating, setCreating] = useState<"TV" | "RADIO" | null>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  /* Slug нь хэрэглэгчийн гараар оруулсан уу — оруулсан бол auto-update хийхгүй */
  const [slugTouched, setSlugTouched] = useState(false);

  /* Нэр оруулахад slug автомат шинэчлэх (хэрэв slug гараар бичээгүй бол) */
  function setName(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
  }

  function setSlug(slug: string) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug }));
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await api.get<ApiResponse<Channel[]>>("/api/admin/channels");
    setChannels(r.data.data);
    setLoading(false);
  }

  function openCreate(kind: "TV" | "RADIO") {
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
    const payload = {
      name: form.name, slug: form.slug, kind,
      streamUrl:    form.streamUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      isActive:     form.isActive,
      orderIndex:   Number(form.orderIndex) || 0,
    };
    try {
      if (editing) await api.patch(`/api/admin/channels/${editing.id}`, payload);
      else         await api.post("/api/admin/channels", payload);
      setEditing(null); setCreating(null);
      await load();
    } catch (e) { setError(getApiError(e).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(c: Channel) {
    const ok = await confirmDialog({
      title:   `"${c.name}"-ийг устгах уу?`,
      message: "Энэ үйлдлийг буцаах боломжгүй. Суваг устгагдсаны дараа холбоотой stream URL, EPG тохиргоо алга болно.",
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

  const isOpen = creating !== null || editing !== null;
  const modalKind: ChannelKind = editing?.kind ?? creating ?? "TV";

  return (
    <div>
      <PageHeader
        title="Дамжуулалт"
        subtitle="Live broadcast, TV сувгууд болон радио — нэгдсэн удирдлага"
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
                <Button size="sm" onClick={() => openCreate("LIVE" as "TV")}>
                  <Plus size={14} /> LIVE үүсгэх
                </Button>
              </div>
            )}
          </SectionCard>

          {/* ─── 2. TV сувгууд ────────────────── */}
          <SectionCard
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

      {/* TV/RADIO create/edit modal */}
      <Modal open={isOpen && modalKind !== "LIVE"} onClose={() => { setCreating(null); setEditing(null); }}
        title={editing ? `${KIND_LABEL[modalKind]} засах` : `Шинэ ${KIND_LABEL[modalKind].toLowerCase()}`}>
        <div className="space-y-4">
          <Field label="Нэр (заавал)" hint="Жагсаалтад харагдах нэр (Жишээ: 'МНБ News')">
            <Input value={form.name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field
            label="Slug — URL-д ашиглах техникийн нэр (заавал)"
            hint="Зөвхөн жижиг үсэг, тоо, зураас (-). Нэрээс автоматаар үүсэх боловч засаж болно. Жишээ: mnb-news"
          >
            <Input value={form.slug} onChange={(e) => setSlug(e.target.value)}
              placeholder="mnb-news" />
          </Field>
          <Field label="HLS Stream URL (.m3u8)">
            <Input value={form.streamUrl} onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              placeholder="https://stream.mnb.mn/..." />
          </Field>
          <Field
            label={modalKind === "RADIO" ? "Thumbnail URL (заавал)" : "Thumbnail URL"}
            hint={modalKind === "RADIO" ? "Радио сувагт thumbnail зайлшгүй шаардлагатай" : undefined}
          >
            <Input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
          </Field>
          {/* Харагдах дараалал нь үүсгэх үед автоматаар хамгийн сүүлд орно.
             Жагсаалт дотор дараалал өөрчилөхдөө мөрийг чирээд зөөнө —
             form талбар оруулах хэрэггүй. */}
          <Toggle
            checked={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
            label="Сувгийн төлөв"
            onLabel="Идэвхтэй"
            offLabel="Унтраалттай"
          />
          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setCreating(null); setEditing(null); }}>Болих</Button>
            <Button onClick={handleSave} loading={saving}
              disabled={
                !form.name.trim() || !form.slug.trim() ||
                (modalKind === "RADIO" && !form.thumbnailUrl.trim())
              }>
              {editing ? "Хадгалах" : "Үүсгэх"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* LIVE create modal — ердийн TV-аас тусдаа, цөөн талбартай */}
      <Modal open={creating === "LIVE" as ChannelKind || (editing?.kind === "LIVE" && isOpen)}
        onClose={() => { setCreating(null); setEditing(null); }}
        title="LIVE үүсгэх">
        <div className="space-y-4">
          <Field label="Тайлбар (заавал)">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="МНБ үндсэн live" autoFocus />
          </Field>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="mnb-live" />
          </Field>
          <Field label="HLS Stream URL (заавал)">
            <Input value={form.streamUrl} onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              placeholder="https://stream.mnb.mn/live/index.m3u8" />
          </Field>
          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setCreating(null); setEditing(null); }}>Болих</Button>
            <Button onClick={handleSave} loading={saving}
              disabled={!form.name.trim() || !form.slug.trim() || !form.streamUrl.trim()}>
              Үүсгэх
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const KIND_LABEL: Record<ChannelKind, string> = {
  LIVE: "LIVE", TV: "Суваг", RADIO: "Радио",
};

/* ════════════════════════════════════════════════════════ */
function SectionCard({
  icon: Icon, title, subtitle, action, children,
}: {
  icon: typeof Wifi;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* LIVE форм — нэг бичлэгтэй inline edit (нэр + URL).
   Унтраах/асаах toggle нь SectionCard header-ийн баруун дээд буланд тусдаа байрлана. */
function LiveForm({ channel, onSaved }: { channel: Channel; onSaved: () => void }) {
  const [name, setName]     = useState(channel.name);
  const [streamUrl, setUrl] = useState(channel.streamUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    setName(channel.name);
    setUrl(channel.streamUrl ?? "");
  }, [channel.id, channel.updatedAt]);

  const dirty = name !== channel.name || streamUrl !== (channel.streamUrl ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/api/admin/channels/${channel.id}`, {
        name, streamUrl: streamUrl || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onSaved();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <Field label="Тайлбар">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="HLS Stream URL">
        <Input value={streamUrl} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://stream.mnb.mn/live/index.m3u8" />
      </Field>
      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          {saved ? "Хадгалагдлаа ✓" : "Хадгалах"}
        </Button>
      </div>
    </div>
  );
}

/* LIVE асаах/унтраах toggle — section header-ийн баруун дээд буланд.
   Өөрчилөхөд confirm dialog гарч ирэх → батлахад шууд хадгалагдана. */
function LiveBroadcastToggle({ channel, onChanged }: { channel: Channel; onChanged: () => void }) {
  const confirmDialog = useConfirm();
  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    const ok = await confirmDialog(
      next
        ? {
            title:   "Шууд дамжуулалт эхлүүлэх үү?",
            message: `"${channel.name}" сувгийн live broadcast-ыг асаах болно. Хэрэглэгчид шууд үзэж эхлэх боломжтой.`,
            confirmLabel: "Тийм, эхлүүлэх",
            tone:    "default",
          }
        : {
            title:   "Шууд дамжуулалтыг зогсоох уу?",
            message: `"${channel.name}" эфир зогсоно. Үзэж байгаа хэрэглэгчид тасрах болно.`,
            confirmLabel: "Тийм, зогсоох",
            tone:    "warning",
          },
    );
    if (!ok) return;

    setSaving(true);
    try {
      await api.patch(`/api/admin/channels/${channel.id}`, { isActive: next });
      toast.success(next ? "Шууд дамжуулалт асаагдлаа" : "Шууд дамжуулалт зогссон");
      onChanged();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Toggle
      checked={channel.isActive}
      onChange={handleToggle}
      disabled={saving}
      onLabel="ШУУД ЦАЦАЖ БАЙНА"
      offLabel="Унтраалттай"
    />
  );
}

/* TV / RADIO жагсаалтын table — drag-drop reorder-той */
function ChannelTable({
  items, onEdit, onDelete, onReorder, showThumb,
}: {
  items: Channel[];
  onEdit: (c: Channel) => void;
  onDelete: (c: Channel) => void;
  onReorder: (reordered: Channel[]) => void;
  showThumb?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dropId) setDropId(id);
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDropId(null);
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const from = items.findIndex((c) => c.id === dragId);
    const to   = items.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) { setDragId(null); return; }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    onReorder(next);
  }

  return (
    <Table>
      <THead>
        <TH></TH>
        <TH>#</TH>
        {showThumb && <TH>Зураг</TH>}
        <TH>Нэр / Slug</TH>
        <TH>Stream URL</TH>
        <TH>Төлөв</TH>
        <TH className="text-right">Үйлдэл</TH>
      </THead>
      <TBody>
        {items.map((c, i) => {
          const isDragging = dragId === c.id;
          const isDropTarget = dropId === c.id && dragId !== c.id;
          return (
            <tr key={c.id}
              draggable
              onDragStart={(e) => handleDragStart(e, c.id)}
              onDragOver={(e) => handleDragOver(e, c.id)}
              onDragEnd={() => { setDragId(null); setDropId(null); }}
              onDrop={(e) => handleDrop(e, c.id)}
              className={cn(
                "transition-colors border-b border-border last:border-b-0",
                isDragging && "opacity-40",
                isDropTarget && "bg-primary-soft border-t-2 border-t-primary",
                !isDragging && !isDropTarget && "hover:bg-bg",
              )}
            >
              <TD className="w-6 cursor-grab active:cursor-grabbing select-none">
                <GripVertical size={14} className="text-muted-strong" />
              </TD>
              <TD className="text-muted text-xs">{i}</TD>
              {showThumb && (
                <TD>
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt="" className="w-20 h-10 object-cover rounded" />
                  ) : <span className="w-10 h-10 inline-block rounded bg-bg border border-border" />}
                </TD>
              )}
              <TD>
                <p className="font-medium text-fg">{c.name}</p>
                <p className="text-xs text-muted font-mono">{c.slug}</p>
              </TD>
              <TD className="text-xs font-mono text-muted truncate max-w-[260px]">
                {c.streamUrl ?? "—"}
              </TD>
              <TD>
                <Badge tone={c.isActive ? "success" : "neutral"}>
                  {c.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                </Badge>
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(c)}><Edit size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(c)}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </TD>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}
