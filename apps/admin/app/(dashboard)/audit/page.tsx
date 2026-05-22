"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, PaginatedResponse, AuditLog } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
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
  REFUND:       "Refund хийв",
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
      return `${actor} → ${target} төлбөрийг refund хийв`;
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

export default function AuditPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const { accessToken } = useAuthStore();
  const [filter, setFilter] = useState("");
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [page, setPage]     = useState(1);
  const [data, setData]     = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId]   = useState<string | null>(null);

  useEffect(() => { load(); }, [filter, from, to, page]);

  async function load() {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filter) params.targetType = filter;
    if (from)   params.from = from;
    if (to)     params.to   = to;
    const r = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>("/api/admin/audit", { params });
    setData(r.data.data);
    setLoading(false);
  }

  /* CSV export — token-ыг URL-руу хийхгүйн тулд fetch + blob ашиглана */
  async function handleExport() {
    const params = new URLSearchParams();
    if (filter) params.set("targetType", filter);
    if (from)   params.set("from", from);
    if (to)     params.set("to", to);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit/export.xlsx?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, credentials: "include" },
    );
    if (!res.ok) { toast.error("Экспорт амжилтгүй"); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <PageHeader
        title="Үйлдлийн түүх"
        subtitle="Админуудын хийсэн бүх өөрчлөлт — экспорт боломжтой"
        action={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Excel экспорт
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4 grid md:grid-cols-3 gap-3">
        <Field label="Чигт">
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="w-full h-9 px-3 rounded-md text-sm bg-surface border border-border focus:outline-none focus:border-primary">
            {TARGET_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Эхлэх огноо">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </Field>
        <Field label="Дуусах огноо">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </Field>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна...</p>
      ) : !data || data.items.length === 0 ? (
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
              {data.items.map((a) => {
                const open = openId === a.id;
                const sentence = describeAction(a);
                const hasDetail = Boolean(a.before || a.after);

                return (
                  <Fragment key={a.id}>
                    <TR>
                      <TD className="text-xs text-muted whitespace-nowrap align-top">
                        <p>{formatDateTime(a.createdAt)}</p>
                        {a.ip && <p className="text-[10px] font-mono mt-0.5">{a.ip}</p>}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge tone={ACTION_TONE[a.action] ?? "neutral"}>{ACTION_LABEL[a.action] ?? a.action}</Badge>
                          <Badge tone="neutral" className="text-[10px]">{a.actor.role}</Badge>
                        </div>
                        <p className="text-sm text-fg leading-snug">{sentence}</p>
                      </TD>
                      <TD className="text-xs text-muted max-w-[260px]">
                        {a.reason ?? <span className="text-muted-strong">—</span>}
                      </TD>
                      <TD className="text-right align-top">
                        {hasDetail && (
                          <button onClick={() => setOpenId(open ? null : a.id)}
                            className="p-1 text-muted hover:text-fg transition-colors">
                            <ChevronDown size={14}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted">Хуудас {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}>Өмнөх</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}>Дараах</Button>
              </div>
            </div>
          )}
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
          <p className="text-[10px] uppercase font-semibold text-muted mb-1">Шалтгаан</p>
          <p className="text-sm text-fg">{reason}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {before !== undefined && before !== null && (
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted mb-1">Өмнө</p>
            <pre className="text-[11px] font-mono bg-surface border border-border rounded p-2 overflow-x-auto max-h-40">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        )}
        {after !== undefined && after !== null && (
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted mb-1">Дараа</p>
            <pre className="text-[11px] font-mono bg-surface border border-border rounded p-2 overflow-x-auto max-h-40">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
