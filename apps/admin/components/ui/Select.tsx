"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  error?: boolean;
}

/* Native <select>-ийг Input-тэй ижил стильд оруулсан wrapper.
   Native ашигласан учир mobile/keyboard/a11y бэлэн. */
export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ options, error, className, ...rest }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full h-9 pl-3 pr-8 rounded-md text-sm bg-surface text-fg appearance-none",
          "border border-border focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
          "disabled:bg-bg disabled:cursor-not-allowed [touch-action:manipulation]",
          error && "border-danger focus:border-danger focus-visible:ring-danger/15",
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  ),
);
Select.displayName = "Select";
