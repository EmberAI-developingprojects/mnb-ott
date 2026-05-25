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
import { Badge } from "@/components/ui/Badge";
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
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;

    api.get<ApiResponse<PaginatedResponse<User>>>("/api/admin/users", { params })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [search, roleFilter, page]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <PageHeader
        title="Хэрэглэгчид"
        subtitle={data ? `Нийт ${data.total.toLocaleString("mn-MN")} хэрэглэгч` : ""}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Нэр, утас, и-мэйлээр хайх..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as Role | ""); setPage(1); }}
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
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="Тохирох хэрэглэгч олдсонгүй" />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Хэрэглэгч</TH>
              <TH>Холбоо</TH>
              <TH>Багц</TH>
              <TH>Роль</TH>
              <TH>Төлөв</TH>
              <TH>Бүртгүүлсэн</TH>
              <TH className="text-right">Үйлдэл</TH>
            </THead>
            <TBody>
              {data.items.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-medium text-fg">{u.name ?? "—"}</p>
                  </TD>
                  <TD className="text-muted">
                    {u.email ?? u.phone ?? "—"}
                  </TD>
                  <TD>
                    {u.subscription ? (
                      <Badge tone="primary">{u.subscription.planType}</Badge>
                    ) : <span className="text-muted text-xs">—</span>}
                  </TD>
                  <TD>
                    <Badge tone={u.role === "USER" ? "neutral" : "primary"}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TD>
                  <TD>
                    {u.isBlocked
                      ? <Badge tone="danger">Блоктой</Badge>
                      : u.isVerified
                        ? <Badge tone="success">Идэвхтэй</Badge>
                        : <Badge tone="warning">Баталгаажаагүй</Badge>
                    }
                  </TD>
                  <TD className="text-muted text-xs">{formatDate(u.createdAt)}</TD>
                  <TD className="text-right">
                    <Link href={`/users/${u.id}`}>
                      <Button variant="ghost" size="sm">Дэлгэрэнгүй</Button>
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted">
                Хуудас {page} / {totalPages}
              </span>
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
