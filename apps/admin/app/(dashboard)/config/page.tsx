"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { GROUPS, OTHER_GROUP, type Group } from "./_lib/groups";

interface ConfigEntry {
  value: string;
  label: string;
}
type Configs = Record<string, ConfigEntry>;

/* /config — групп бүрд карт. Дарвал /config/[group] руу залгана.
   Тус бүр хэсэгрүүгээ зайтай хуудаст ордог тул scroll/толгойн нэг бүхэл. */
export default function ConfigIndexPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [configs, setConfigs] = useState<Configs>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<{ configs: Configs }>>("/api/admin/config")
      .then((r) => setConfigs(r.data.data.configs))
      .catch((e) => toast.error(getApiError(e).message))
      .finally(() => setLoading(false));
  }, []);

  /* Групп бүрийн key тоог тооцоолох */
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    GROUPS.forEach((g) => map.set(g.key, 0));
    map.set(OTHER_GROUP.key, 0);
    Object.keys(configs).forEach((k) => {
      const g = GROUPS.find((g) => g.match(k));
      const key = g ? g.key : OTHER_GROUP.key;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [configs]);

  /* Үлдсэн "Бусад" группд ямар нэг key ороогүй бол харуулахгүй */
  const sections: Group[] = [
    ...GROUPS,
    ...(((counts.get(OTHER_GROUP.key) ?? 0) > 0) ? [OTHER_GROUP] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Системийн тохиргоо"
        subtitle="Хэсэг бүр дээр дарж дотор нь оруулсан утгуудыг засна"
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {sections.map((g) => {
            const count = counts.get(g.key) ?? 0;
            if (count === 0 && g.key !== "other") return null;
            const Icon = g.icon;
            return (
              <Link key={g.key} href={`/config/${g.key}`}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-lg bg-surface border border-border
                  hover:border-primary/40 hover:bg-bg transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <div className="w-10 h-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-fg">{g.title}</h2>
                    <span className="text-[11px] text-muted tabular-nums">{count} утга</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{g.subtitle}</p>
                </div>
                <ChevronRight size={16} aria-hidden="true"
                  className="text-muted shrink-0 group-hover:text-fg group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
