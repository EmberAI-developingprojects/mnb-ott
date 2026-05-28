"use client";

import { forwardRef, useId, isValidElement, cloneElement, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactElement } from "react";
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
  label: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  const id      = useId();
  const errorId = `${id}-error`;
  const hintId  = `${id}-hint`;

  /* Хяналтыг (input/select/textarea) label-тай id-аар холбоно.
     Ганц element хүүхэд бол id + aria-* шинжийг автоматаар ононо. */
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement, {
        id: (children as ReactElement).props.id ?? id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : hint ? hintId : undefined,
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-fg">{label}</label>
      {control}
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
      {!error && hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
