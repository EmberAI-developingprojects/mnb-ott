"use client";

import { useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse, PaginatedResponse, Payment, PaymentStatus } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success", PENDING: "warning", FAILED: "danger", CANCELLED: "neutral", REFUNDED: "warning",
};

export default function PaymentsPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [filter, setFilter] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [loading, setLoading] = useState(true);

  const [refundOpen, setRefundOpen] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => { load(); }, [filter, page]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (filter) params.status = filter;
      const r = await api.get<ApiResponse<PaginatedResponse<Payment>>>("/api/admin/payments", { params });
      setData(r.data.data);
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund() {
    if (!refundOpen) return;
    setRefunding(true);
    try {
      await api.post(`/api/admin/payments/${refundOpen.id}/refund`, { reason });
      setRefundOpen(null); setReason("");
      await load();
      toast.success("Төлбөр амжилттай буцаагдлаа");
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setRefunding(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <PageHeader
        title="Төлбөр"
        subtitle={data ? `Нийт ${data.total.toLocaleString("mn-MN")} гүйлгээ` : ""}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["", "PAID", "PENDING", "FAILED", "REFUNDED"] as const).map((s) => (
          <button key={s} onClick={() => { setFilter(s as PaymentStatus | ""); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "bg-surface border-border text-fg hover:bg-bg"
            }`}>
            {s === "" ? "Бүгд" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-lg shadow-card p-12 text-center text-sm text-muted">
          Уншиж байна...
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="Гүйлгээ байхгүй" />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Хэрэглэгч</TH>
              <TH>Дүн</TH>
              <TH>Invoice</TH>
              <TH>Төлөв</TH>
              <TH>Огноо</TH>
              <TH className="text-right">Үйлдэл</TH>
            </THead>
            <TBody>
              {data.items.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <p className="font-medium text-fg">{p.user.name ?? "—"}</p>
                    <p className="text-xs text-muted">{p.user.email ?? p.user.phone}</p>
                  </TD>
                  <TD className="font-semibold">{formatCurrency(p.amount)}</TD>
                  <TD className="text-xs font-mono text-muted">{p.invoiceId.slice(0, 12)}…</TD>
                  <TD>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </TD>
                  <TD className="text-xs text-muted">{formatDateTime(p.createdAt)}</TD>
                  <TD className="text-right">
                    {p.status === "PAID" && (
                      <Button variant="ghost" size="sm" onClick={() => setRefundOpen(p)}>
                        Буцаалт
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
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

      <Modal open={refundOpen !== null} onClose={() => { setRefundOpen(null); setReason(""); }}
        title="Төлбөр буцаах">
        <div className="space-y-4">
          {refundOpen && (
            <div className="bg-bg rounded-md p-3 border border-border space-y-1">
              <p className="text-sm">
                <span className="text-muted">Хэрэглэгч:</span> {refundOpen.user.name ?? "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted">Дүн:</span> <strong>{formatCurrency(refundOpen.amount)}</strong>
              </p>
              <p className="text-xs text-muted font-mono">{refundOpen.invoiceId}</p>
            </div>
          )}
          <Field label="Шалтгаан (заавал)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Жишээ: Хэрэглэгчийн хүсэлтээр" />
          </Field>
          <p className="text-xs text-muted">
            Энэ үйлдэл гүйлгээний төлвийг &quot;Буцаагдсан&quot; болгож тэмдэглэнэ. Мөнгөн дүнгийн буцаалтыг QPay-ээр тусад нь гүйцэтгэнэ.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setRefundOpen(null); setReason(""); }}>Болих</Button>
            <Button variant="danger" loading={refunding} disabled={!reason.trim()} onClick={handleRefund}>
              Төлбөр буцаах
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
