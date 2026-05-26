"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

interface HistoryItem {
  id:        string;
  type:      "subscription" | "vod_rental" | "live_ppv";
  title:     string;
  amount:    number;
  status:    string;
  paidAt?:   string;
  createdAt: string;
  expiresAt?:string;
  method?:   string;
}

/* Icon — нэг өнгөгүй (currentColor), төрөл бүрд subtle ялгаа */
const ICON: Record<HistoryItem["type"], JSX.Element> = {
  subscription: <><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="11" x2="21" y2="11"/></>,
  vod_rental:   <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>,
  live_ppv:     <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></>,
};

const TYPE_LABEL: Record<HistoryItem["type"], [string, string]> = {
  subscription: ["Захиалга",      "Subscription"],
  vod_rental:   ["Видео түрээс",  "Video rental"],
  live_ppv:     ["LIVE",          "LIVE"],
};

export default function PurchasesPage() {
  const { lang } = useSettingsStore();
  const [items, setItems]     = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

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
        <div className="py-20 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-card/50 border border-app flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
              className="text-muted">
              <path d="M9 2L7 6H2v14a2 2 0 002 2h16a2 2 0 002-2V6h-5l-2-4H9z"/>
              <path d="M16 10a4 4 0 11-8 0"/>
            </svg>
          </div>
          <p className="text-app font-semibold">
            {lang === "mn" ? "Худалдан авалт байхгүй" : "No purchases yet"}
          </p>
          <p className="text-[13px] text-muted">
            {lang === "mn" ? "Эхний захиалга энд харагдана" : "Your first purchase will appear here"}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, visible).map((it) => {
            const isActive  = it.status === "PAID" || it.status === "ACTIVE";
            const isExpired = it.expiresAt ? new Date(it.expiresAt) < new Date() : false;
            const typeLabel = TYPE_LABEL[it.type]?.[lang === "mn" ? 0 : 1] ?? it.type;
            return (
              <li key={it.id}
                className="group relative flex items-start gap-3.5 p-4 rounded-2xl border border-app bg-card hover:bg-card-hover transition-colors">
                {/* Icon — neutral monochrome */}
                <div className="w-10 h-10 shrink-0 rounded-full bg-bg border border-app flex items-center justify-center text-app">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {ICON[it.type] ?? ICON.subscription}
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <p className="text-[14px] font-semibold text-app truncate">{it.title}</p>
                    <span className="text-[10.5px] text-muted shrink-0 hidden sm:inline">{typeLabel}</span>
                  </div>
                  <p className="text-[11.5px] text-muted tabular-nums">
                    {new Date(it.createdAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {it.expiresAt && !isExpired && (
                      <> · {lang === "mn" ? "Дуусах" : "expires"} {new Date(it.expiresAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US", { month: "short", day: "numeric" })}</>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-app tabular-nums">
                    {it.amount.toLocaleString("mn-MN")}<span className="text-muted text-[11px] font-normal ml-0.5">₮</span>
                  </p>
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider mt-1",
                    isExpired || !isActive ? "text-muted" : "text-sub",
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

      <LoadMoreButton hasMore={visible < items.length}
        onMore={() => setVisible((v) => v + PAGE_SIZE)} />
    </div>
  );
}
