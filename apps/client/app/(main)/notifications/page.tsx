"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import type { AppNotification } from "@/types";

const PAGE_SIZE = 8;

/* Мэдэгдлийн icon. Зөвхөн нэг өнгөгүй (currentColor) line icon —
   "олон өнгө байхгүй, зөөлөн" концепцид нийцэнэ. */
const ICON: Record<string, JSX.Element> = {
  SUBSCRIPTION: <path d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4M12 11v10" />,
  PAYMENT:      <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20M6 14h4" /></>,
  CONTENT:      <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" /></>,
  PROMO:        <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
  SYSTEM:       <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8"  x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
};

const TYPE_LABEL: Record<string, [string, string]> = {
  SUBSCRIPTION: ["Захиалга", "Subscription"],
  PAYMENT:      ["Төлбөр",   "Payment"],
  CONTENT:      ["Контент",  "Content"],
  PROMO:        ["Урамшуулал","Promo"],
  SYSTEM:       ["Систем",   "System"],
};

/* Огноогоор ангилах key — өнөөдөр / 7 хоног / урт хугацаа */
type BucketKey = "today" | "week" | "earlier";
const BUCKET_LABEL: Record<BucketKey, [string, string]> = {
  today:   ["Өнөөдөр",        "Today"],
  week:    ["Энэ долоо хоног", "This week"],
  earlier: ["Эрт",            "Earlier"],
};

function bucketOf(d: string): BucketKey {
  const date = new Date(d);
  const now  = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return "today";
  const diffDays = (now.getTime() - date.getTime()) / 86400000;
  if (diffDays < 7) return "week";
  return "earlier";
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const { lang } = useSettingsStore();
  const t = useT();
  /* Shared store — header дээрх dot-той sync байх */
  const { setUnread, decrement, clear } = useNotificationsStore();
  const [items, setItems]   = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [cursor, setCursor]   = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login?callbackUrl=/notifications"); return; }
    api.get<{ success: true; data: { items: AppNotification[]; nextCursor: string | null } }>(
      "/api/notifications", { params: { limit: PAGE_SIZE } },
    )
      .then((r) => {
        setItems(r.data.data.items);
        setCursor(r.data.data.nextCursor);
        /* Header polling-аар хүлээхгүй — ачаалсан page-ээс шууд store-руу sync */
        setUnread(r.data.data.items.filter((n) => !n.isRead).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, router]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get<{ success: true; data: { items: AppNotification[]; nextCursor: string | null } }>(
        "/api/notifications", { params: { limit: PAGE_SIZE, cursor } },
      );
      setItems((arr) => [...arr, ...r.data.data.items]);
      setCursor(r.data.data.nextCursor);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }

  async function markRead(id: string) {
    /* Хэрэв аль хэдийн уншсан бол header dot-д нөлөөлөхгүй */
    const wasUnread = items.find((n) => n.id === id)?.isRead === false;
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, isRead: true } : n));
    if (wasUnread) decrement();
    try { await api.patch(`/api/notifications/${id}/read`); } catch { /* silent */ }
  }

  async function markAll() {
    setMarking(true);
    setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
    clear();
    try { await api.post("/api/notifications/mark-all-read"); }
    catch { /* silent */ }
    finally { setMarking(false); }
  }

  async function remove(id: string) {
    setItems((arr) => arr.filter((n) => n.id !== id));
    setConfirmDel(null);
    try { await api.delete(`/api/notifications/${id}`); } catch { /* silent */ }
  }

  const unread  = items.filter((n) => !n.isRead).length;
  const grouped = useMemo(() => {
    const out: Record<BucketKey, AppNotification[]> = { today: [], week: [], earlier: [] };
    items.forEach((n) => out[bucketOf(n.createdAt)].push(n));
    return out;
  }, [items]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+32px)] pb-16">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-[28px] font-bold text-app tracking-tight">
          {lang === "mn" ? "Мэдэгдэл" : "Notifications"}
        </h1>

        {unread > 0 && (
          <button onClick={markAll} disabled={marking}
            className="text-[13px] font-medium text-sub hover:text-app transition-colors disabled:opacity-50 shrink-0">
            {t("notif_mark_all")}
          </button>
        )}
      </header>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <div className="space-y-8">
          {(Object.keys(grouped) as BucketKey[]).map((bucket) => {
            const list = grouped[bucket];
            if (list.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted mb-3 px-1">
                  {BUCKET_LABEL[bucket][lang === "mn" ? 0 : 1]}
                </h2>
                <ul className="space-y-1.5">
                  {list.map((n) => (
                    <NotificationRow
                      key={n.id}
                      n={n}
                      lang={lang}
                      onRead={markRead}
                      onAskDelete={setConfirmDel}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onMore={loadMore} />

      {/* Delete confirmation modal — зөөлөн */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 overlay-bg backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmDel(null)}>
          <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-pop animate-scale-in"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-app">
              {lang === "mn" ? "Мэдэгдэл устгах уу?" : "Delete notification?"}
            </h2>
            <p className="text-sm text-sub leading-relaxed">
              {lang === "mn" ? "Энэ үйлдлийг буцаах боломжгүй." : "This action cannot be undone."}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-sub hover:text-app hover:bg-card-hover transition-colors">
                {lang === "mn" ? "Болих" : "Cancel"}
              </button>
              <button onClick={() => remove(confirmDel)}
                className="flex-1 py-2.5 rounded-xl bg-app text-bg text-sm font-semibold hover:opacity-90 transition-opacity">
                {lang === "mn" ? "Устгах" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Нэг row — өнгөгүй, соло accent, хулгана дээр subtle lift
───────────────────────────────────────────────────── */
function NotificationRow({
  n, lang, onRead, onAskDelete,
}: {
  n: AppNotification;
  lang: "mn" | "en";
  onRead: (id: string) => void;
  onAskDelete: (id: string) => void;
}) {
  const Wrapper = n.link ? Link : "div" as React.ElementType;
  const typeLabel = TYPE_LABEL[n.type]?.[lang === "mn" ? 0 : 1] ?? n.type;

  return (
    <li
      className={cn(
        "group relative flex gap-3.5 items-start p-4 rounded-2xl transition-colors duration-200",
        n.isRead
          ? "border border-app bg-card hover:bg-card-hover"
          /* Уншаагүй мэдэгдэл — арай тод hint: strong border + жижиг ring + бага зэрэг tint */
          : "border border-[var(--border-strong)] bg-card-hover ring-1 ring-[var(--border-strong)]/40 hover:bg-card",
      )}>
      {/* Уншаагүй гэдгийн соло stripe — зүүн дээр, brand өнгөгүй */}
      {!n.isRead && (
        <span aria-hidden="true"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-full bg-app" />
      )}

      {/* Icon — circular neutral */}
      <div className="w-10 h-10 shrink-0 rounded-full bg-bg border border-app flex items-center justify-center text-app">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {ICON[n.type] ?? ICON.SYSTEM}
        </svg>
      </div>

      {/* Content */}
      <Wrapper
        {...(n.link ? { href: n.link, onClick: () => onRead(n.id) } : { onClick: () => onRead(n.id) })}
        className="flex-1 min-w-0 cursor-pointer">
        <div className="flex items-baseline gap-2 mb-1">
          <p className={cn("text-[14.5px] truncate text-app", !n.isRead && "font-semibold")}>
            {n.title}
          </p>
          <span className="text-[10.5px] text-muted shrink-0 hidden sm:inline">{typeLabel}</span>
        </div>
        <p className="text-[13px] text-sub leading-relaxed line-clamp-2">{n.body}</p>
        <p className="text-[11px] text-muted mt-2 tabular-nums">
          {new Date(n.createdAt).toLocaleString(lang === "mn" ? "mn-MN" : "en-US", {
            hour: "2-digit", minute: "2-digit", month: "short", day: "numeric",
          })}
        </p>
      </Wrapper>

      {/* Delete — soft, hover-д харагдана */}
      <button onClick={() => onAskDelete(n.id)}
        className="absolute top-2 right-2 sm:opacity-0 group-hover:opacity-100 transition-opacity
          w-7 h-7 rounded-full text-muted hover:text-app hover:bg-card-hover flex items-center justify-center"
        aria-label={lang === "mn" ? "Устгах" : "Delete"}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </li>
  );
}

/* ─────────────────────────────────────────────────────
   Empty — meditative, том outline icon + 2 мөр text
───────────────────────────────────────────────────── */
function EmptyState({ lang }: { lang: "mn" | "en" }) {
  return (
    <div className="py-24 text-center space-y-4">
      <div className="w-20 h-20 mx-auto rounded-full bg-card/50 border border-app flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-app font-semibold">
          {lang === "mn" ? "Мэдэгдэл алга" : "No notifications"}
        </p>
        <p className="text-[13px] text-muted">
          {lang === "mn" ? "Шинэ мэдэгдэл орвол энд харагдана" : "New notifications will appear here"}
        </p>
      </div>
    </div>
  );
}
