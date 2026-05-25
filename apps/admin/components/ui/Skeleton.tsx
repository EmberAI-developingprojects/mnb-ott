import { cn } from "@/lib/utils";

/* Контент уншиж байх үед layout shift-гүй placeholder.
   prefers-reduced-motion үед pulse унтарна. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-md bg-border/60 motion-safe:animate-pulse", className)}
    />
  );
}
