"use client";

import { cn } from "@/lib/utils";

/* iOS маягийн toggle switch — checkbox-аас илүү тод харагдана.
   On/Off label оруулж болно. */
interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?:    string;
  onLabel?:  string;
  offLabel?: string;
  disabled?: boolean;
}

export function Toggle({
  checked, onChange, label, onLabel, offLabel, disabled,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-3 select-none transition-opacity",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "relative inline-block w-12 h-7 rounded-full transition-colors shrink-0",
          checked ? "bg-success" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
      {(label || onLabel || offLabel) && (
        <span className="flex flex-col items-start text-left leading-tight">
          {label && <span className="text-sm font-medium text-fg">{label}</span>}
          <span className={cn(
            "text-xs font-semibold",
            checked ? "text-success" : "text-muted",
          )}>
            {checked ? (onLabel ?? "Идэвхтэй") : (offLabel ?? "Унтраалттай")}
          </span>
        </span>
      )}
    </button>
  );
}
