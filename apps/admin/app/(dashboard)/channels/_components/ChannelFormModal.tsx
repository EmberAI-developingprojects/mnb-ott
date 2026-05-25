"use client";

import type { ChannelKind } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

export interface ChannelFormData {
  name:         string;
  slug:         string;
  streamUrl:    string;
  thumbnailUrl: string;
  isActive:     boolean;
  orderIndex:   string;
}

export const EMPTY_FORM: ChannelFormData = {
  name: "", slug: "", streamUrl: "", thumbnailUrl: "", isActive: true, orderIndex: "0",
};

const KIND_LABEL: Record<ChannelKind, string> = {
  LIVE: "LIVE", TV: "Суваг", RADIO: "Радио",
};

/* TV / RADIO channel үүсгэх / засах modal. LIVE-аас ялгаатай нь:
   - Slug, thumbnail хэрэгтэй
   - RADIO үед thumbnail заавал
   - LIVE form илүү цөөн талбартай тусдаа LiveCreateModal-аар */
export function ChannelFormModal({
  open, kind, editing, form, error, saving,
  onClose, onSave, onNameChange, onSlugChange, onFieldChange,
}: {
  open:        boolean;
  kind:        ChannelKind;
  editing:     boolean;
  form:        ChannelFormData;
  error:       string;
  saving:      boolean;
  onClose:     () => void;
  onSave:      () => void;
  onNameChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onFieldChange: (patch: Partial<ChannelFormData>) => void;
}) {
  const disableSave =
    !form.name.trim() || !form.slug.trim() ||
    (kind === "RADIO" && !form.thumbnailUrl.trim());

  return (
    <Modal open={open} onClose={onClose}
      title={editing ? `${KIND_LABEL[kind]} засах` : `Шинэ ${KIND_LABEL[kind].toLowerCase()}`}>
      <div className="space-y-4">
        <Field label="Нэр (заавал)" hint="Жагсаалтад харагдах нэр (Жишээ: 'МНБ News')">
          <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} autoFocus />
        </Field>

        <Field
          label="Slug — URL-д ашиглах техникийн нэр (заавал)"
          hint="Зөвхөн жижиг үсэг, тоо, зураас (-). Нэрээс автоматаар үүсэх боловч засаж болно. Жишээ: mnb-news"
        >
          <Input value={form.slug} onChange={(e) => onSlugChange(e.target.value)}
            placeholder="mnb-news" />
        </Field>

        <Field label="HLS Stream URL (.m3u8)">
          <Input value={form.streamUrl}
            onChange={(e) => onFieldChange({ streamUrl: e.target.value })}
            placeholder="https://stream.mnb.mn/..." />
        </Field>

        <Field
          label={kind === "RADIO" ? "Thumbnail URL (заавал)" : "Thumbnail URL"}
          hint={kind === "RADIO" ? "Радио сувагт thumbnail зайлшгүй шаардлагатай" : undefined}
        >
          <Input value={form.thumbnailUrl}
            onChange={(e) => onFieldChange({ thumbnailUrl: e.target.value })} />
        </Field>

        <Toggle
          checked={form.isActive}
          onChange={(v) => onFieldChange({ isActive: v })}
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
          <Button variant="ghost" onClick={onClose}>Болих</Button>
          <Button onClick={onSave} loading={saving} disabled={disableSave}>
            {editing ? "Хадгалах" : "Үүсгэх"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* LIVE үүсгэх modal — ердийн TV-аас тусдаа, цөөн талбартай.
   LIVE нэг л байх боломжтой тул `editing` хувилбар хэрэггүй. */
export function LiveCreateModal({
  open, form, error, saving, onClose, onSave, onFieldChange,
}: {
  open:    boolean;
  form:    ChannelFormData;
  error:   string;
  saving:  boolean;
  onClose: () => void;
  onSave:  () => void;
  onFieldChange: (patch: Partial<ChannelFormData>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="LIVE үүсгэх">
      <div className="space-y-4">
        <Field label="Тайлбар (заавал)">
          <Input value={form.name}
            onChange={(e) => onFieldChange({ name: e.target.value })}
            placeholder="МНБ үндсэн live" autoFocus />
        </Field>
        <Field label="Slug">
          <Input value={form.slug}
            onChange={(e) => onFieldChange({ slug: e.target.value })}
            placeholder="mnb-live" />
        </Field>
        <Field label="HLS Stream URL (заавал)">
          <Input value={form.streamUrl}
            onChange={(e) => onFieldChange({ streamUrl: e.target.value })}
            placeholder="https://stream.mnb.mn/live/index.m3u8" />
        </Field>

        {error && (
          <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Болих</Button>
          <Button onClick={onSave} loading={saving}
            disabled={!form.name.trim() || !form.slug.trim() || !form.streamUrl.trim()}>
            Үүсгэх
          </Button>
        </div>
      </div>
    </Modal>
  );
}
