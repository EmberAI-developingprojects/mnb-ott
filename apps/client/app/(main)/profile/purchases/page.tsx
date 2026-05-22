"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id:        string;
  type:      "subscription" | "vod_rental";
  title:     string;
  amount:    number;
  status:    string;
  paidAt?:   string;
  createdAt: string;
  expiresAt?:string;
  method?:   string;
}

export default function PurchasesPage() {
  const { lang } = useSettingsStore();
  const [items, setItems]     = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: true; data: { items: HistoryItem[] } }>("/api/payment/history")
      .then((r) => setItems(r.data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-app">
        {lang === "mn" ? "Худалдан авалтын түүх" : "Purchase history"}
      </h1>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted bg-card rounded-xl border border-app">
          {lang === "mn" ? "Худалдан авалт байхгүй байна" : "No purchases yet"}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] bg-card rounded-xl border border-app overflow-hidden">
          {items.map((it) => {
            const isActive  = it.status === "PAID" || it.status === "ACTIVE";
            const isExpired = it.expiresAt ? new Date(it.expiresAt) < new Date() : false;
            return (
              <li key={it.id} className="px-4 py-3.5 flex items-center gap-4">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  it.type === "subscription" ? "bg-accent/15 text-accent" : "bg-purple-500/15 text-purple-400",
                )}>
                  {it.type === "subscription" ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="6" width="18" height="13" rx="2"/>
                      <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="3" y1="11" x2="21" y2="11"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-app truncate">{it.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(it.createdAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {it.expiresAt && !isExpired && (
                      <> · {lang === "mn" ? "Дуусах" : "expires"} {new Date(it.expiresAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US", { month: "short", day: "numeric" })}</>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-app tabular-nums">
                    {it.amount.toLocaleString("mn-MN")}<span className="text-muted text-xs font-normal">₮</span>
                  </p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                    isExpired   ? "text-muted"
                  : isActive    ? "text-emerald-400"
                                : "text-muted",
                  )}>
                    {isExpired
                      ? (lang === "mn" ? "Дууссан" : "Expired")
                      : isActive
                        ? (lang === "mn" ? "Идэвхтэй" : "Active")
                        : it.status}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
