"use client";

import { useState } from "react";
import { Edit, Trash2, GripVertical } from "lucide-react";
import type { Channel } from "@/types";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/* TV / RADIO жагсаалтын table — HTML5 native drag-drop reorder-той.
   Drop хийсний дараа `onReorder(newList)` дуудаж parent-д үлдсэн логик
   (orderIndex шинэчлэх API call) хийгдэнэ. */
export function ChannelTable({
  items, onEdit, onDelete, onReorder, showThumb,
}: {
  items:      Channel[];
  onEdit:     (c: Channel) => void;
  onDelete:   (c: Channel) => void;
  onReorder:  (reordered: Channel[]) => void;
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
