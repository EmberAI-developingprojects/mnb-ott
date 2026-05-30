import { cn } from "@/lib/utils";

/* Skeleton — gradient shimmer sweep ашигладаг (plain pulse-аас илүү амьд).
   globals.css дахь .animate-shimmer класс gradient + keyframe-ийг хариуцна. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-shimmer rounded-lg", className)} />
  );
}
