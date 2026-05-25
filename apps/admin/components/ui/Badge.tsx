import { cn } from "@/lib/utils";

/* Badge — enterprise/admin маягийн нэгдсэн стиль.
   Бүх badge нэг л background (саарал)-тэй, status-ыг ЗӨВХӨН жижиг цэгээр
   илэрхийлнэ. Wide color block ашиглахгүй (Stripe/Linear/GitHub маяг). */

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const DOT_CLS: Record<Tone, string> = {
  neutral: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  primary: "bg-primary",
};

export function Badge({ children, tone = "neutral", className }: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
      "bg-bg border border-border text-fg",
      className,
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_CLS[tone])} />
      {children}
    </span>
  );
}
