import type { LucideIcon } from "lucide-react";

/* Channel section header with icon + title + subtitle + action slot.
   LIVE / TV / RADIO 3 хэсгээс ашиглагдана. */
export function SectionCard({
  icon: Icon, title, subtitle, action, children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
