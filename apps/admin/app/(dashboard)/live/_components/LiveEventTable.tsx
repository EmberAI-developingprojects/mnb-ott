"use client";

import { Edit, Trash2 } from "lucide-react";
import type { Channel } from "@/types";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

/* LIVE event-ийн жагсаалт table. status-аас хамаарч өнгө, цаг харагдах хэлбэр өөр.
   live: эхэлсэн цаг + дуусах хүртэлх countdown
   upcoming: эхлэхэд үлдсэн countdown + дуусах цаг
   past: эхэлсэн + дууссан огноо */
export function LiveEventTable({
  events, status, now, onEdit, onDelete,
}: {
  events:   Channel[];
  status:   "live" | "upcoming" | "past";
  now:      number;
  onEdit:   (c: Channel) => void;
  onDelete: (c: Channel) => void;
}) {
  return (
    <Table>
      <THead>
        <TH>Нэр / Slug</TH>
        <TH>Эхлэх</TH>
        <TH>Дуусах</TH>
        <TH>Үнэ</TH>
        <TH>Төлөв</TH>
        <TH className="text-right">Үйлдэл</TH>
      </THead>
      <TBody>
        {events.map((e) => {
          const starts = e.startsAt ? new Date(e.startsAt).getTime() : null;
          const ends   = e.endsAt   ? new Date(e.endsAt).getTime()   : null;

          /* status тус бүрд харагдах "remaining" утга */
          let remaining: string | null = null;
          if (status === "live"     && ends)   remaining = fmtDuration(ends - now);
          if (status === "upcoming" && starts) remaining = fmtDuration(starts - now);

          return (
            <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-bg transition-colors">
              <TD>
                <p className="font-medium text-fg">{e.name}</p>
                <p className="text-xs text-muted font-mono">{e.slug}</p>
              </TD>
              <TD>
                {starts ? (
                  <p className="text-xs font-mono tabular-nums text-fg">{fmtDate(starts)}</p>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
                {status === "upcoming" && remaining && (
                  <p className="text-[11px] text-blue-500 mt-0.5">{remaining}-ийн дараа эхэлнэ</p>
                )}
              </TD>
              <TD>
                {ends ? (
                  <p className="text-xs font-mono tabular-nums text-fg">{fmtDate(ends)}</p>
                ) : (
                  <span className="text-xs text-muted">∞ (хязгааргүй)</span>
                )}
                {status === "live" && remaining && (
                  <p className="text-[11px] text-red-500 mt-0.5">Дуусахад {remaining}</p>
                )}
              </TD>
              <TD>
                {e.price ? (
                  <span className="font-mono tabular-nums text-sm text-fg">{e.price.toLocaleString("mn-MN")}₮</span>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </TD>
              <TD>
                <Badge tone={statusTone(status, e.isActive)}>
                  {statusLabel(status, e.isActive)}
                </Badge>
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(e)}><Edit size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(e)}>
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

function statusTone(status: "live" | "upcoming" | "past", isActive: boolean): "success" | "primary" | "neutral" | "danger" {
  if (!isActive) return "neutral";
  if (status === "live")     return "danger";
  if (status === "upcoming") return "primary";
  return "neutral";
}

function statusLabel(status: "live" | "upcoming" | "past", isActive: boolean): string {
  if (!isActive) return "Идэвхгүй";
  if (status === "live")     return "ШУУД";
  if (status === "upcoming") return "Хүлээж буй";
  return "Дууссан";
}

/* "2026.05.27 16:30" формат */
function fmtDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ms-ээс human duration ("2ц 15м" эсвэл "15м 30с") */
function fmtDuration(ms: number): string {
  if (ms <= 0) return "0с";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}ө ${h}ц`;
  if (h > 0) return `${h}ц ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}
