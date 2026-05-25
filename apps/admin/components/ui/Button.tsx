"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size    = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  ghost:   "bg-transparent text-fg hover:bg-bg",
  outline: "bg-surface border border-border text-fg hover:bg-bg",
  danger:  "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
};

const SIZE_CLS: Record<Size, string> = {
  sm: "h-8  px-3 text-xs",
  md: "h-9  px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...rest }, ref) => (
    <button ref={ref} disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium [touch-action:manipulation]",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLS[variant], SIZE_CLS[size], className,
      )}
      {...rest}>
      {loading && (
        <svg aria-hidden="true" className="motion-safe:animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
