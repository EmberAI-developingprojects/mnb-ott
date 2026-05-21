import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "live" | "free" | "premium" | "default";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
        variant === "live" && "bg-danger text-white",
        variant === "free" && "bg-[var(--border-strong)] text-muted",
        variant === "premium" && "bg-primary text-white",
        variant === "default" && "bg-[var(--border-strong)] text-app",
        className
      )}
    >
      {variant === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      {children}
    </span>
  );
}
