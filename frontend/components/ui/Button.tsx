import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-40",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-primary text-white hover:bg-blue-700",
        variant === "outline" && "border border-app text-app hover:bg-[var(--border)]",
        variant === "ghost" && "text-app hover:bg-[var(--border)]",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
