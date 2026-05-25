"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { PlanType } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

const PLANS: PlanType[] = ["BASIC", "TV", "VOD", "COMBO"];

export default function NotificationsPage() {
  const confirmDialog = useConfirm();
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [type, setType]         = useState<"SYSTEM" | "PROMO" | "CONTENT">("SYSTEM");
  const [plans, setPlans]       = useState<PlanType[]>([]);
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<{ sent: number } | null>(null);
  const [error, setError]       = useState("");

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
        { title, body, type, planFilter: plans.length > 0 ? plans : undefined },
      );
      setResult(r.data.data);
      setTitle(""); setBody("");
      toast.success(`${r.data.data.sent.toLocaleString("mn-MN")} хэрэглэгчид илгээгдлээ`);
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
    </div>
  );
}
