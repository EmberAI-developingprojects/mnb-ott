"use client";

import { useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Channel } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

/* LIVE форм — нэг бичлэгтэй inline edit (нэр + URL).
   Унтраах/асаах toggle нь SectionCard header-ийн баруун дээд буланд тусдаа. */
export function LiveForm({ channel, onSaved }: { channel: Channel; onSaved: () => void }) {
  const [name, setName]     = useState(channel.name);
  const [streamUrl, setUrl] = useState(channel.streamUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    setName(channel.name);
    setUrl(channel.streamUrl ?? "");
    /* channel.id/updatedAt солигдоход л form reset — name/streamUrl-ийг dep-д
       оруулбал хэрэглэгчийн засвар дунд reset болно. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
