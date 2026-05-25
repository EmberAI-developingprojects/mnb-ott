"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open:    boolean;
  onClose: () => void;
  title:   string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, size = "md" }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    /* Нээгдэхэд фокусыг modal дотор оруулна (фокус ард үлдэхгүй) */
    panelRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={cn("w-full bg-surface rounded-lg shadow-xl border border-border outline-none [overscroll-behavior:contain]", SIZE_CLS[size])}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id={titleId} className="text-base font-semibold text-fg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Хаах"
            className="text-muted hover:text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
