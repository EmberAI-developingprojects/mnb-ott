"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Бүх `alert()` болон амжилт/алдааны мэдэгдлийг солих жижиг toast систем.
   Хэрэглээ:
     toast.error("Алдаа гарлаа");
     toast.success("Хадгалагдлаа");
*/

type Tone = "success" | "error" | "info" | "warning";

interface Toast {
  id:      number;
  message: string;
  tone:    Tone;
}

interface ToastState {
  items: Toast[];
  push:  (message: string, tone: Tone) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (message, tone) => {
    const id = Date.now() + Math.random();
    set({ items: [...get().items, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

/* `toast` API — store-руу шууд push, hook бус */
export const toast = {
  success: (m: string) => useToastStore.getState().push(m, "success"),
  error:   (m: string) => useToastStore.getState().push(m, "error"),
  info:    (m: string) => useToastStore.getState().push(m, "info"),
  warning: (m: string) => useToastStore.getState().push(m, "warning"),
};

const TONE_CFG: Record<Tone, { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2,   cls: "bg-success/10  border-success/30  text-success" },
  error:   { icon: XCircle,        cls: "bg-danger/10   border-danger/30   text-danger" },
  info:    { icon: Info,           cls: "bg-primary-soft border-primary/30 text-primary" },
  warning: { icon: AlertTriangle,  cls: "bg-warning/10  border-warning/30  text-warning" },
};

export function ToastRoot() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  /* ESC дарвал хамгийн сүүлийн toast хаагдана */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && items.length > 0) {
        dismiss(items[items.length - 1].id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, dismiss]);

  if (items.length === 0) return null;

  return (
    <div role="region" aria-label="Мэдэгдэл" aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {items.map((t) => {
        const cfg = TONE_CFG[t.tone];
        const Icon = cfg.icon;
        return (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg bg-surface",
              "motion-safe:animate-in motion-safe:slide-in-from-right",
              cfg.cls,
            )}
          >
            <Icon size={16} aria-hidden="true" className="shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-fg leading-snug">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Хаах"
              className="text-muted hover:text-fg transition-colors shrink-0 mt-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
