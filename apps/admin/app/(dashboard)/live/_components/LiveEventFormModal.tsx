"use client";

import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

export interface LiveFormData {
  name:         string;
  slug:         string;
  streamUrl:    string;
  thumbnailUrl: string;
  isActive:     boolean;
  orderIndex:   string;
  price:        string;
  /* datetime-local input value — "YYYY-MM-DDTHH:mm" формат */
  startsAt:     string;
  endsAt:       string;
}

export const EMPTY_FORM: LiveFormData = {
  name: "", slug: "", streamUrl: "", thumbnailUrl: "", isActive: true,
  orderIndex: "0", price: "", startsAt: "", endsAt: "",
};

/* LIVE event-ийн form modal — startsAt + endsAt + price бүхий. */
export function LiveEventFormModal({
  open, editing, form, error, saving,
  onClose, onSave, onNameChange, onSlugChange, onFieldChange,
}: {
  open:    boolean;
  editing: boolean;
  form:    LiveFormData;
  error:   string;
  saving:  boolean;
  onClose: () => void;
  onSave:  () => void;
  onNameChange:  (v: string) => void;
  onSlugChange:  (v: string) => void;
  onFieldChange: (patch: Partial<LiveFormData>) => void;
}) {
  const disableSave =
    !form.name.trim() || !form.slug.trim();

  return (
    <Modal open={open} onClose={onClose}
      title={editing ? "LIVE event засах" : "Шинэ LIVE event"}>
      <div className="space-y-4">
        <Field label="Нэр (заавал)" hint="Хэрэглэгчдэд харагдах нэр. Жишээ: 'МНБ vs Эрчим — Хагас финал'">
          <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} autoFocus />
        </Field>

        <Field label="Slug (заавал)" hint="URL-д ашиглах техникийн нэр. Зөвхөн жижиг үсэг + зураас.">
          <Input value={form.slug} onChange={(e) => onSlugChange(e.target.value)}
            placeholder="mnb-vs-erchim" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Эхлэх хугацаа" hint="Хэзээ эхлэх. Хоосон бол шууд эхэлсэн гэж үзнэ.">
            <Input type="datetime-local" value={form.startsAt}
              onChange={(e) => onFieldChange({ startsAt: e.target.value })} />
          </Field>

          <Field label="Дуусах хугацаа" hint="Хэзээ дуусах. Хоосон бол хязгааргүй.">
            <Input type="datetime-local" value={form.endsAt}
              onChange={(e) => onFieldChange({ endsAt: e.target.value })} />
          </Field>
        </div>

        <Field label="Үнэ (₮)" hint="PPV — хэрэглэгч худалдан авч 24 цаг үзнэ. Хоосон бол үнэгүй.">
          <Input type="number" min={0} value={form.price}
            onChange={(e) => onFieldChange({ price: e.target.value })}
            placeholder="5000" />
        </Field>

        <Field label="HLS Stream URL (.m3u8)">
          <Input value={form.streamUrl}
            onChange={(e) => onFieldChange({ streamUrl: e.target.value })}
            placeholder="https://stream.mnb.mn/..." />
        </Field>

        <Field label="Thumbnail URL" hint="Banner-д харагдах зураг (recommended)">
          <Input value={form.thumbnailUrl}
            onChange={(e) => onFieldChange({ thumbnailUrl: e.target.value })}
            placeholder="https://..." />
        </Field>

        <Field label="Order index" hint="Олон LIVE event байх үед эрэмбэлэх дугаар.">
          <Input type="number" min={0} value={form.orderIndex}
            onChange={(e) => onFieldChange({ orderIndex: e.target.value })} />
        </Field>

        <div className="flex items-center gap-3">
          <Toggle checked={form.isActive}
            onChange={(v) => onFieldChange({ isActive: v })} />
          <span className="text-sm text-fg">Идэвхтэй (хэрэглэгчдэд харагдана)</span>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Болих</Button>
          <Button onClick={onSave} disabled={saving || disableSave}>
            {saving ? "Хадгалж байна..." : editing ? "Шинэчлэх" : "Үүсгэх"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
