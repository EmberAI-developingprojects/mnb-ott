"use client";

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Link2, Clock, User } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, PlanType } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

const PLANS: PlanType[] = ["BASIC", "TV", "VOD", "COMBO"];

interface SentBroadcast {
  id:         string;
  sentAt:     string;
  actor:      { id: string; name: string | null; email: string | null; phone: string | null } | null;
  title:      string;
  body:       string;
  type:       string;
  link:       string | null;
  planFilter: string[] | null;
  recipients: number;
}

export default function NotificationsPage() {
  const confirmDialog = useConfirm();
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [link, setLink]         = useState("");
  const [type, setType]         = useState<"SYSTEM" | "PROMO" | "CONTENT">("SYSTEM");
  const [plans, setPlans]       = useState<PlanType[]>([]);
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<{ sent: number } | null>(null);
  const [error, setError]       = useState("");

  /* Илгээгдсэн broadcast-уудын түүх — audit log-аас (server-ээс cursor pagination) */
  const [history, setHistory]       = useState<SentBroadcast[]>([]);
  const [historyCursor, setCursor]  = useState<string | null>(null);
  const [historyLoading, setHistLd] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadHistory(cursor?: string) {
    const r = await api.get<ApiResponse<{ items: SentBroadcast[]; nextCursor: string | null }>>(
      "/api/admin/notifications/broadcasts", { params: { limit: 10, cursor } },
    );
    return r.data.data;
  }

  useEffect(() => {
    loadHistory()
      .then((d) => { setHistory(d.items); setCursor(d.nextCursor); })
      .catch(() => {})
      .finally(() => setHistLd(false));
  }, []);

  async function loadMore() {
    if (!historyCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await loadHistory(historyCursor);
      setHistory((arr) => [...arr, ...d.items]);
      setCursor(d.nextCursor);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }

  function togglePlan(p: PlanType) {
    setPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    const ok = await confirmDialog({
      title: "Мэдэгдэл илгээх үү?",
      message: plans.length === 0
        ? "Бүх хэрэглэгчид (зочин биш, бүртгэлтэй) мэдэгдэл илгээгдэнэ."
        : `Зөвхөн ${plans.join(", ")} багцтай идэвхтэй хэрэглэгчид илгээгдэнэ.`,
      confirmLabel: "Илгээх",
    });
    if (!ok) return;

    setSending(true); setError(""); setResult(null);
    try {
      const r = await api.post<{ success: true; data: { sent: number } }>(
        "/api/admin/notifications/broadcast",
        {
          title, body, type,
          planFilter: plans.length > 0 ? plans : undefined,
          link:       link.trim() || undefined,
        },
      );
      setResult(r.data.data);
      setTitle(""); setBody(""); setLink("");
      toast.success(`${r.data.data.sent.toLocaleString("mn-MN")} хэрэглэгчид илгээгдлээ`);
      /* История refresh — шинээр илгээсэн нь жагсаалтын дээд талд орохын тулд */
      const d = await loadHistory();
      setHistory(d.items); setCursor(d.nextCursor);
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Мэдэгдэл илгээх"
        subtitle="Бүх эсвэл сонгосон багцтай хэрэглэгчдэд бөөн мэдэгдэл илгээх"
      />

      <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-5 max-w-2xl">
        <Field label="Гарчиг">
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Жишээ: Шинэ кино гарлаа" />
        </Field>

        <Field label="Агуулга">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
            placeholder="Дэлгэрэнгүй..." />
        </Field>

        <Field label="Холбоос (заавал биш)"
          hint="Хэрэглэгч мэдэгдэл дээр дарвал энэ замаар очно. Жишээ: /vod/abc123, /bundles/documentary">
          <Input value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="/vod/abc123" />
        </Field>

        <Field label="Төрөл">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full h-9 px-3 rounded-md text-sm bg-surface border border-border focus:outline-none focus:border-primary">
            <option value="SYSTEM">Системийн мэдэгдэл</option>
            <option value="PROMO">Сурталчилгаа</option>
            <option value="CONTENT">Шинэ контент</option>
          </select>
        </Field>

        <Field label="Зорилтот хэрэглэгчид"
          hint={plans.length === 0 ? "Хоосон = бүх хэрэглэгчид" : `Сонгосон багц: ${plans.join(", ")}`}>
          <div className="flex flex-wrap gap-2">
            {PLANS.map((p) => (
              <button key={p} type="button" onClick={() => togglePlan(p)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  plans.includes(p)
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border text-fg hover:bg-bg"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-md text-xs text-danger">
            {error}
          </div>
        )}

        {result && (
          <div className="px-3 py-2 bg-success/10 border border-success/30 rounded-md text-sm text-success flex items-center gap-2">
            <CheckCircle2 size={14} />
            {result.sent.toLocaleString("mn-MN")} хэрэглэгчид илгээгдлээ
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSend} loading={sending} disabled={!title.trim() || !body.trim()}>
            <Send size={14} /> Илгээх
          </Button>
        </div>
      </div>

      {/* ─── Илгээгдсэн мэдэгдлүүдийн түүх ─── */}
      <div className="mt-8 max-w-2xl">
        <h2 className="text-sm font-semibold text-fg mb-3">Илгээсэн мэдэгдлүүд</h2>
        {historyLoading ? (
          <div className="bg-surface border border-border rounded-lg p-6 text-center text-sm text-muted">
            Уншиж байна...
          </div>
        ) : history.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-6 text-center text-sm text-muted">
            Хараахан илгээгээгүй
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="bg-surface border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{h.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{h.body}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">
                    {h.type}
                  </span>
                </div>

                {h.link && (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted font-mono truncate">
                    <Link2 size={11} /> {h.link}
                  </p>
                )}

                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-strong border-t border-border pt-2">
                  <span className="flex items-center gap-1">
                    <User size={11} /> {h.actor?.name ?? h.actor?.email ?? h.actor?.phone ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatDate(h.sentAt)}
                  </span>
                  <span className="text-fg font-semibold tabular-nums">
                    {h.recipients.toLocaleString("mn-MN")} хэрэглэгчид илгээгдсэн
                  </span>
                  {h.planFilter && h.planFilter.length > 0 && (
                    <span className="text-muted">→ {h.planFilter.join(", ")}</span>
                  )}
                </div>
              </div>
            ))}

            {historyCursor && (
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" onClick={loadMore} loading={loadingMore}>
                  Цааш үзэх
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
