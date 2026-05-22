"use client";

import { create } from "zustand";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/* Native `confirm()`-ийг солих UI modal.
   Хэрэглээ:
     const confirmDialog = useConfirm();
     if (await confirmDialog({ title: "Устгах уу?", message: "..." })) { ... }
*/

type Tone = "default" | "danger" | "warning";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?:  string;
  tone?:         Tone;
}

interface ConfirmState {
  open:    boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  ask:    (opts: ConfirmOptions) => Promise<boolean>;
  close:  (value: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open:    false,
  options: null,
  resolve: null,
  ask: (opts) => new Promise<boolean>((resolve) => {
    set({ open: true, options: opts, resolve });
  }),
  close: (value) => {
    const r = get().resolve;
    r?.(value);
    set({ open: false, options: null, resolve: null });
  },
}));

/* Хэрэглэгчийн hook — Promise<boolean> буцаана */
export function useConfirm() {
  return useConfirmStore((s) => s.ask);
}

/* Глобал dialog — (dashboard)/layout.tsx-д нэг л render хийнэ */
export function ConfirmDialogRoot() {
  const { open, options, close } = useConfirmStore();
  if (!open || !options) return null;

  const tone: Tone = options.tone ?? "default";
  const Icon = tone === "default" ? HelpCircle : AlertTriangle;
  const iconClass = cn(
    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
    tone === "danger"  && "bg-danger/10 text-danger",
    tone === "warning" && "bg-warning/10 text-warning",
    tone === "default" && "bg-primary-soft text-primary",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={() => close(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-surface rounded-lg shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex gap-4">
          <div className={iconClass}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-fg">{options.title}</h2>
            <p className="text-sm text-muted mt-1.5 whitespace-pre-line leading-relaxed">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="ghost" onClick={() => close(false)}>
            {options.cancelLabel ?? "Болих"}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => close(true)}
            autoFocus
          >
            {options.confirmLabel ?? "Тийм"}
          </Button>
        </div>
      </div>
    </div>
  );
}
