"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, PaginatedResponse, User, Role } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Input } from "@/components/ui/Input";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/Table";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  USER: "Хэрэглэгч", EDITOR: "Эдитор", OPERATOR: "Оператор",
  ADMIN: "Админ", SUPER_ADMIN: "Супер админ",
};

export default function UsersPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  /* Load more pattern — items-ыг append хийнэ, filter солигдоход reset */
  const [items, setItems]     = useState<User[]>([]);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(p: number, replace: boolean) {
    if (replace) setLoading(true); else setLoadingMore(true);
    const params: Record<string, string | number> = { page: p };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    try {
      const r = await api.get<ApiResponse<PaginatedResponse<User>>>("/api/admin/users", { params });
      const d = r.data.data;
      setItems((prev) => replace ? d.items : [...prev, ...d.items]);
      setTotal(d.total); setPage(p);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }

  useEffect(() => { load(1, true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, roleFilter]);

  const hasMore = items.length < total;

  return (
    <div>
      <PageHeader
        title="Хэрэглэгчид"
        subtitle={total ? `Нийт ${total.toLocaleString("mn-MN")} хэрэглэгч` : ""}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Нэр, утас, и-мэйлээр хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "")}
          className="h-9 px-3 rounded-md text-sm bg-surface border border-border focus:outline-none focus:border-primary"
        >
          <option value="">Бүх ролиуд</option>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-lg shadow-card p-12 text-center text-sm text-muted">
          Уншиж байна...
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="Тохирох хэрэглэгч олдсонгүй" />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Хэрэглэгч</TH>
              <TH>Холбоо</TH>
              <TH>Багц</TH>
              <TH>Роль</TH>
              <TH>Бүртгүүлсэн</TH>
              <TH className="text-right">Үйлдэл</TH>
            </THead>
            <TBody>
              {items.map((u) => (
                /* Блоктой хэрэглэгчийн мөр улаан өнгөтэй — Badge оронд бүхэл мөр */
                <TR key={u.id} className={u.isBlocked ? "bg-danger/5 text-danger" : undefined}>
                  <TD>
                    <p className="font-medium">{u.name ?? "—"}</p>
                  </TD>
                  <TD className={u.isBlocked ? "" : "text-muted"}>
                    {u.email ?? u.phone ?? "—"}
                  </TD>
                  <TD className="text-xs font-mono uppercase tracking-wider">
                    {u.subscription?.planType ?? <span className="text-muted">—</span>}
                  </TD>
                  <TD className="text-xs">{ROLE_LABEL[u.role]}</TD>
                  <TD className={u.isBlocked ? "text-xs" : "text-muted text-xs"}>{formatDate(u.createdAt)}</TD>
                  <TD className="text-right">
                    <Link href={`/users/${u.id}`}>
                      <Button variant="ghost" size="sm">Дэлгэрэнгүй</Button>
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <LoadMoreButton hasMore={hasMore} loading={loadingMore}
            onMore={() => load(page + 1, false)} />
        </>
      )}
    </div>
  );
}
