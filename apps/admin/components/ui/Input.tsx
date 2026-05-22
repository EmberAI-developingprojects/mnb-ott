"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...rest }, ref) => (
    <input ref={ref}
      className={cn(
        "w-full h-9 px-3 rounded-md text-sm bg-surface text-fg",
        "border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
        "placeholder:text-muted disabled:bg-bg disabled:cursor-not-allowed",
        error && "border-danger focus:border-danger focus:ring-danger/15",
        className,
      )}
      {...rest} />
  ),
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...rest }, ref) => (
    <textarea ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-md text-sm bg-surface text-fg",
        "border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
        "placeholder:text-muted disabled:bg-bg disabled:cursor-not-allowed",
        error && "border-danger focus:border-danger focus:ring-danger/15",
        className,
      )}
      {...rest} />
  ),
);
Textarea.displayName = "Textarea";

export function Field({ label, children, error, hint }: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-fg">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
