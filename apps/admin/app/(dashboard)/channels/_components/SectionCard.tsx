"use client";

import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

/* Channel section header with icon + title + subtitle + action slot.
   LIVE / TV / RADIO 3 хэсгээс ашиглагдана.
   collapsible=true үед header дээр дарж эвхэж/дэлгэж болно. */
export function SectionCard({
  icon: Icon, title, subtitle, action, children,
  collapsible = false, defaultOpen = true,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  /* collapsible үед title хэсэг toggle товч болно. action нь тусдаа —
     түүн дээр дарахад эвхэгдэхгүй (stopPropagation шаардлагагүй, button-аас гадуур). */
  const HeaderInner = (
    <div className="flex items-start gap-3 text-left">
      {collapsible && (
        <ChevronDown
          size={16}
          className={`mt-2 shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
      )}
      <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden shadow-card">
      <div className={`flex items-start justify-between gap-4 px-5 py-4 ${open ? "border-b border-border" : ""}`}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex-1 rounded-md hover:opacity-80 transition-opacity"
          >
            {HeaderInner}
          </button>
        ) : (
          HeaderInner
        )}
        {action}
      </div>
      {open && children}
    </section>
  );
}
