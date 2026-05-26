"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import {
  GROUPS, OTHER_GROUP, ENUM_OPTIONS,
  getSuffix, valueKind, isInvalid, type Kind,
} from "../_lib/groups";

interface ConfigEntry { value: string; label: string; }
type Configs = Record<string, ConfigEntry>;

/* /config/[group] — тухайн группын config-уудыг нэг хуудаст харуулна.
   List page-ийн accordion биш — бүхэл бие нь өөр route. */
export default function ConfigGroupPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const params = useParams<{ group: string }>();
  const groupKey = params.group;

  const group = [...GROUPS, OTHER_GROUP].find((g) => g.key === groupKey);
  if (!group) notFound();

  const [configs, setConfigs] = useState<Configs>({});
  const [drafts, setDrafts]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<{ configs: Configs }>>("/api/admin/config");
      setConfigs(r.data.data.configs);
      setDrafts({});
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  /* Энэ группд орох key-ийг filter */
  const items = useMemo(() => {
    return Object.entries(configs)
      .filter(([k]) => {
        if (group!.key === "other") {
          /* Бусад: GROUPS-ын аль ч pattern-д орохгүй */
          return !GROUPS.some((g) => g.match(k));
        }
        return group!.match(k);
      })
      .sort(([a], [b]) => a.localeCompare(b));
  }, [configs, group]);

  function setDraft(key: string, v: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      if (v === configs[key]?.value) delete next[key];
      else next[key] = v;
      return next;
    });
  }

  const dirtyKeys   = Object.keys(drafts);
  const invalidKeys = dirtyKeys.filter((k) => isInvalid(valueKind(k, configs[k].value), drafts[k]));

  useEffect(() => {
    if (dirtyKeys.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyKeys.length]);

  async function handleSaveAll() {
    if (dirtyKeys.length === 0 || invalidKeys.length > 0) return;
    setSaving(true);
    try {
      await Promise.all(dirtyKeys.map((k) => api.patch(`/api/admin/config/${k}`, { value: drafts[k] })));
      toast.success(`${dirtyKeys.length} тохиргоо хадгалагдлаа`);
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  const Icon = group.icon;

  return (
    <div>
      <Link href="/config"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg mb-4 transition-colors">
        <ChevronLeft size={14} /> Системийн тохиргоо
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-fg">{group.title}</h1>
          <p className="text-sm text-muted mt-0.5">{group.subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-9 w-44" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
          Энэ хэсэгт тохиргоо алга
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg shadow-card divide-y divide-border">
          {items.map(([key, cfg]) => (
            <ConfigRow
              key={key}
              configKey={key}
              entry={cfg}
              draft={drafts[key] ?? cfg.value}
              edited={drafts[key] !== undefined}
              onChange={(v) => setDraft(key, v)}
              onEnter={handleSaveAll}
            />
          ))}
        </div>
      )}

      {/* Sticky save bar — өөрчлөлттэй үед л гарна */}
      {dirtyKeys.length > 0 && (
        <div className="sticky bottom-4 z-30 mt-6" role="region" aria-label="Хадгалаагүй өөрчлөлт">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-surface px-4 py-3 shadow-lg">
            <p className="text-sm text-fg">
              <span className="font-semibold">{dirtyKeys.length}</span> өөрчлөлт хадгалаагүй
              {invalidKeys.length > 0 && (
                <span className="text-danger"> · {invalidKeys.length} буруу утга</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDrafts({})} disabled={saving}>
                Болих
              </Button>
              <Button size="sm" loading={saving} disabled={invalidKeys.length > 0} onClick={handleSaveAll}>
                Бүгдийг хадгалах
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  configKey, entry, draft, edited, onChange, onEnter,
}: {
  configKey: string;
  entry: ConfigEntry;
  draft: string;
  edited: boolean;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const kind: Kind = valueKind(configKey, entry.value);
  const suffix     = getSuffix(configKey);
  const invalid    = isInvalid(kind, draft);

  return (
    <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 hover:bg-bg transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{entry.label}</p>
        <p className="text-[11px] text-muted font-mono mt-0.5 truncate">{configKey}</p>
      </div>

      <div className="w-full sm:w-auto shrink-0">
        {kind === "boolean" ? (
          <Toggle checked={draft === "true"} onChange={(next) => onChange(next ? "true" : "false")} />
        ) : kind === "enum" ? (
          <Select
            options={ENUM_OPTIONS[configKey]}
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            className={cnEdited(edited, "w-full sm:w-52")}
          />
        ) : (
          <div className="relative w-full sm:w-44">
            <Input
              type={kind === "number" ? "number" : "text"}
              inputMode={kind === "number" ? "numeric" : undefined}
              min={kind === "number" ? 0 : undefined}
              value={draft}
              error={invalid}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
              className={cnEdited(edited, `text-right ${suffix ? "pr-12" : ""}`)}
            />
            {suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
                {suffix}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function cnEdited(edited: boolean, base: string): string {
  return `${base}${edited ? " border-primary focus:border-primary" : ""}`;
}
