"use client";

import { useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Channel } from "@/types";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

/* LIVE асаах/унтраах toggle — section header-ийн баруун дээд буланд.
   Өөрчилөхөд confirm dialog гарч ирэх → батлахад шууд хадгалагдана. */
export function LiveBroadcastToggle({
  channel, onChanged,
}: {
  channel: Channel;
  onChanged: () => void;
}) {
  const confirmDialog = useConfirm();
  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    const ok = await confirmDialog(
      next
        ? {
            title:   "Шууд дамжуулалт эхлүүлэх үү?",
            message: `"${channel.name}" сувгийн шууд дамжуулалтыг эхлүүлэх болно. Хэрэглэгчид шууд үзэж эхлэх боломжтой.`,
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
