"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, PaginatedResponse, AuditLog } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

/* Action кодыг монгол хэлээр харуулна */
const ACTION_LABEL: Record<string, string> = {
  CREATE:       "Үүсгэв",
  UPDATE:       "Шинэчлэв",
  DELETE:       "Устгав",
  ROLE_CHANGE:  "Роль өөрчлөв",
  BAN:          "Блок хийв",
  UNBAN:        "Блок арилгав",
  REFUND:       "Буцаалт хийв",
  BROADCAST:    "Мэдэгдэл илгээв",
  ADD_ITEM:     "Багцад нэмэв",
  REMOVE_ITEM:  "Багцаас хасав",
};

const ACTION_TONE: Record<string, "success" | "warning" | "danger" | "primary" | "neutral"> = {
  CREATE: "success", UPDATE: "primary", DELETE: "danger",
  ROLE_CHANGE: "warning", BAN: "danger", UNBAN: "success",
  REFUND: "warning", BROADCAST: "primary",
  ADD_ITEM: "success", REMOVE_ITEM: "warning",
};

const TARGET_LABEL: Record<string, string> = {
  user: "хэрэглэгч", vod: "видео", channel: "суваг",
  bundle: "багц", payment: "төлбөр", notification: "мэдэгдэл", config: "тохиргоо",
};

/* Үйлдлийг бүтэн өгүүлбэр болгож хөрвүүлэх:
   "Б.Бат — Ц.Цэнгэлийн ролыг USER → EDITOR болгов"
   "Tsengel админ — 'Кино2024' видеог устгав"
   "А.Алтан — 19,900₮ refund хийв (шалтгаан: ...)" */
function describeAction(a: AuditLog): string {
  const actor  = a.actor.name ?? a.actor.email ?? a.actor.phone ?? "—";
  const target = a.targetName ?? (a.targetId ? a.targetId.slice(0, 8) : "");
  const targetWord = TARGET_LABEL[a.targetType] ?? a.targetType;

  const before = (a.before ?? {}) as Record<string, unknown>;
  const after  = (a.after  ?? {}) as Record<string, unknown>;

  switch (a.action) {
    case "ROLE_CHANGE":
      return `${actor} → ${target}-ийн ролыг ${before.role ?? "?"} → ${after.role ?? "?"} болгов`;
    case "BAN":
      return `${actor} → ${target}-ийг блок хийв`;
    case "UNBAN":
      return `${actor} → ${target}-ийн блокыг арилгав`;
    case "REFUND":
      return `${actor} → ${target} төлбөрийг буцаав`;
    case "CREATE":
      return `${actor} → шинэ ${targetWord} үүсгэв${target ? `: "${target}"` : ""}`;
    case "DELETE":
      return `${actor} → ${targetWord} устгав${target ? `: "${target}"` : ""}`;
    case "UPDATE": {
      const changed = Object.keys({ ...before, ...after })
        .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
        .slice(0, 3);
      const what = changed.length > 0 ? ` (${changed.join(", ")})` : "";
      return `${actor} → ${targetWord} "${target}" шинэчлэв${what}`;
    }
    case "BROADCAST": {
      const recipients = (after as { recipients?: number }).recipients ?? 0;
      const title = (after as { title?: string }).title ?? "";
      return `${actor} → ${recipients.toLocaleString("mn-MN")} хэрэглэгчид мэдэгдэл илгээв${title ? `: "${title}"` : ""}`;
    }
    case "ADD_ITEM":
      return `${actor} → "${target}" багцад видео нэмэв`;
    case "REMOVE_ITEM":
      return `${actor} → "${target}" багцаас видео хасав`;
    default:
      return `${actor} → ${ACTION_LABEL[a.action] ?? a.action} (${targetWord})`;
  }
}

const TARGET_FILTERS: Array<{ value: string; label: string }> = [
  { value: "",             label: "Бүгд" },
  { value: "user",         label: "Хэрэглэгч" },
  { value: "vod",          label: "Видео" },
  { value: "channel",      label: "Суваг" },
  { value: "bundle",       label: "Багц" },
  { value: "payment",      label: "Төлбөр" },
  { value: "notification", label: "Мэдэгдэл" },
];

/* Хугацааны preset — default 7 хоног, санал болгох 14/30, "Тусгай" = өөрөө сонгох */
type RangeKey = "7" | "14" | "30" | "all" | "custom";
const RANGES: Array<{ value: RangeKey; label: string; days?: number }> = [
  { value: "7",      label: "7 хоног",  days: 7 },
  { value: "14",     label: "14 хоног", days: 14 },
  { value: "30",     label: "30 хоног", days: 30 },
  { value: "all",    label: "Бүгд" },
  { value: "custom", label: "Тусгай" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/* Идэвхтэй preset-ээс query-д явуулах from/to (ISO) тооцоолно.
   custom: date-only input-ийг өдрийн эхлэл/төгсгөл болгож (same-day-ийг бүрэн хамруулна). */
function rangeToParams(range: RangeKey, customFrom: string, customTo: string): { from?: string; to?: string } {
  if (range === "all") return {};
  if (range === "custom") {
    const out: { from?: string; to?: string } = {};
    if (customFrom) out.from = new Date(`${customFrom}T00:00:00`).toISOString();
    if (customTo)   out.to   = new Date(`${customTo}T23:59:59.999`).toISOString();
    return out;
  }
  const days = Number(range);
  return { from: new Date(Date.now() - days * DAY_MS).toISOString() };
}

export default function AuditPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [filter, setFilter] = useState("");
  const [range, setRange]   = useState<RangeKey>("7"); /* default = сүүлийн 7 хоног */
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  /* Page биш — items array-г load more-аар өргөтгөнө. Filter/range солигдсон үед reset. */
  const [items, setItems]     = useState<AuditLog[]>([]);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openId, setOpenId]   = useState<string | null>(null);

  /* Идэвхтэй хугацааны from/to (ISO) — preset эсвэл custom-аас */
  const { from, to } = useMemo(
    () => rangeToParams(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  /* Filter/range солигдоход page=1-ээс шинээр ачаална (replace) */
  useEffect(() => { setPage(1); load(1, true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter, from, to]);

  async function load(p: number, replace: boolean) {
    if (replace) setLoading(true); else setLoadingMore(true);
    const params: Record<string, string | number> = { page: p };
    if (filter) params.targetType = filter;
    if (from)   params.from = from;
    if (to)     params.to   = to;
    try {
      const r = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>("/api/admin/audit", { params });
      const d = r.data.data;
      setItems((prev) => replace ? d.items : [...prev, ...d.items]);
      setTotal(d.total); setPage(p);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }

  const loadedCount = items.length;
  const hasMore = loadedCount < total;

  function selectRange(next: RangeKey) {
    setRange(next);
  }

  /* Excel export — axios instance-аар, токен interceptor + refresh автомат.
     `exporting` flag нь товчинд loading spinner үзүүлж, double-click сэргийлнэ. */
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (filter) params.targetType = filter;
      if (from)   params.from = from;
      if (to)     params.to   = to;

      const res = await api.get("/api/admin/audit/export.xlsx", {
        params, responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href = url;
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel татагдлаа");
    } catch {
      toast.error("Экспорт амжилтгүй");
    } finally {
      setExporting(false);
    }
  }


  return (
    <div>
      <PageHeader
        title="Үйлдлийн түүх"
        subtitle="Админуудын хийсэн бүх өөрчлөлт — экспорт боломжтой"
        action={
          <Button variant="outline" size="sm" onClick={handleExport}
            loading={exporting} disabled={exporting}>
            <Download size={14} /> {exporting ? "Татаж байна..." : "Excel экспорт"}
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg shadow-card p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Field label="">
            <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-44 h-9 px-3 rounded-md text-sm bg-surface text-fg border border-border focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/15">
              {TARGET_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <div className="space-y-1.5">
            {/* <span className="text-xs font-medium text-fg">Хугацаа</span> */}
            <div role="group" aria-label="Хугацааны хязгаар"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg p-1">
              {RANGES.map((r) => {
                const active = range === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => selectRange(r.value)}
                    aria-pressed={active}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      active
                        ? "bg-surface text-fg shadow-card border border-border"
                        : "text-muted hover:text-fg"
                    }`}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Тусгай хугацаа — зөвхөн "Тусгай" сонгоход */}
        {range === "custom" && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <Field label="Эхлэх огноо">
              <Input type="date" value={customFrom} max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)} className="sm:w-44" />
            </Field>
            <Field label="Дуусах огноо">
              <Input type="date" value={customTo} min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)} className="sm:w-44" />
            </Field>
          </div>
        )}
      </div>

      {!loading && items.length > 0 && (
        <p className="text-xs text-muted mb-3" aria-live="polite">
          Нийт <span className="font-semibold text-fg tabular-nums">{total.toLocaleString("mn-MN")}</span> үйлдлээс <span className="font-semibold text-fg tabular-nums">{loadedCount.toLocaleString("mn-MN")}</span>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна…</p>
      ) : items.length === 0 ? (
        <EmptyState message="Тохирох үйлдэл олдсонгүй" />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Огноо</TH>
              <TH>Үйлдэл</TH>
              <TH>Шалтгаан</TH>
              <TH></TH>
            </THead>
            <TBody>
              {items.map((a) => {
                const open = openId === a.id;
                const sentence = describeAction(a);
                const hasDetail = Boolean(a.before || a.after);

                return (
                  <Fragment key={a.id}>
                    <TR>
                      <TD className="text-xs text-muted whitespace-nowrap align-top">
                        <p>{formatDateTime(a.createdAt)}</p>
                        {a.ip && <p className="text-[11px] font-mono mt-0.5">{a.ip}</p>}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge tone={ACTION_TONE[a.action] ?? "neutral"}>{ACTION_LABEL[a.action] ?? a.action}</Badge>
                          <Badge tone="neutral" className="text-[11px]">{a.actor.role}</Badge>
                        </div>
                        <p className="text-sm text-fg leading-snug">{sentence}</p>
                      </TD>
                      <TD className="text-xs text-muted max-w-[260px]">
                        {a.reason ?? <span className="text-muted-strong">—</span>}
                      </TD>
                      <TD className="text-right align-top">
                        {hasDetail && (
                          <button type="button" onClick={() => setOpenId(open ? null : a.id)}
                            aria-label={open ? "Дэлгэрэнгүйг хаах" : "Дэлгэрэнгүйг харах"}
                            aria-expanded={open}
                            className="p-1 text-muted hover:text-fg transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                            <ChevronDown size={14} aria-hidden="true"
                              className={`transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </TD>
                    </TR>
                    {open && (
                      <TR className="bg-bg">
                        <td colSpan={4} className="px-4 py-3 border-l-2 border-primary">
                          <DiffBlock before={a.before} after={a.after} reason={a.reason} />
                        </td>
                      </TR>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>

          <LoadMoreButton hasMore={hasMore} loading={loadingMore}
            onMore={() => load(page + 1, false)} />
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
function DiffBlock({ before, after, reason }: { before: unknown; after: unknown; reason: string | null }) {
  return (
    <div className="space-y-2">
      {reason && (
        <div>
          <p className="text-[11px] uppercase font-semibold text-muted mb-1">Шалтгаан</p>
          <p className="text-sm text-fg">{reason}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {before !== undefined && before !== null && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted mb-1">Өмнө</p>
            <pre className="text-[11px] font-mono bg-surface border border-border rounded p-2 overflow-x-auto max-h-40">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        )}
        {after !== undefined && after !== null && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted mb-1">Дараа</p>
            <pre className="text-[11px] font-mono bg-surface border border-border rounded p-2 overflow-x-auto max-h-40">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
