"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Search, X, ChevronDown, Package, Tv, Smartphone, ShoppingBag,
  KeyRound, CreditCard, Building2, Settings,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";

interface ConfigEntry {
  value: string;
  label: string;
}
type Configs = Record<string, ConfigEntry>;

/* Config key-ийг харьяа категори болгож хувиргана. key prefix-ээр сэдэвчилнэ. */
interface Group {
  key:      string;
  title:    string;
  subtitle: string;
  icon:     typeof Package;
  match:    (key: string) => boolean;
}

const GROUPS: Group[] = [
  { key: "plan-price",   title: "Багцын үнэ",            subtitle: "TV / VOD / COMBO багцын сар, 7 хоногийн үнэ", icon: Package,     match: (k) => k.startsWith("plan.") && k.includes(".price") },
  { key: "device-limit", title: "Төхөөрөмжийн хязгаар",  subtitle: "Нэгэн зэрэг хэдэн төхөөрөмжөөс нэвтрэх вэ",   icon: Smartphone,  match: (k) => k.includes("device_limit") },
  { key: "bundle",       title: "Багц видео (Түрээс)",   subtitle: "TVOD — багцын видеог тус бүрчлэн түрээслэх",  icon: ShoppingBag, match: (k) => k.startsWith("bundle.") },
  { key: "dvr",          title: "DVR — Catch-up",        subtitle: "Live TV өнгөрсөн цацалтыг буцаан үзэх",       icon: Tv,          match: (k) => k.startsWith("dvr.") },
  { key: "otp",          title: "OTP / Нэвтрэлт",        subtitle: "Баталгаажуулах кодын тохиргоо",               icon: KeyRound,    match: (k) => k.startsWith("otp.") },
  { key: "payment",      title: "Төлбөр",                subtitle: "QPay горим, refund бодлого",                  icon: CreditCard,  match: (k) => k.startsWith("payment.") },
  { key: "branding",     title: "Брэнд / Дэмжлэг",       subtitle: "Дэмжлэгийн утас, и-мэйл",                      icon: Building2,   match: (k) => k.startsWith("branding.") },
];

/* Тодорхой key-нүүдийн enum сонголтууд (free-text биш) */
const ENUM_OPTIONS: Record<string, SelectOption[]> = {
  "payment.mode": [
    { value: "mock", label: "Mock — тест горим" },
    { value: "live", label: "QPay — бодит" },
  ],
};

/* Утгын суффикс — input баруун талд visual hint (value-д орохгүй) */
function getSuffix(key: string): string | null {
  if (key.includes(".price"))       return "₮";
  if (key.includes("_minutes"))     return "мин";
  if (key.includes("_hours"))       return "цаг";
  if (key.includes("_days"))        return "хоног";
  if (key.includes("device_limit")) return "төх.";
  if (key.includes(".length"))      return "тэмд.";
  return null;
}

type Kind = "boolean" | "enum" | "number" | "text";

function valueKind(key: string, value: string): Kind {
  if (ENUM_OPTIONS[key])              return "enum";
  if (value === "true" || value === "false") return "boolean";
  if (/(price|limit|minutes|hours|days|length|count)/.test(key)) return "number";
  return "text";
}

/* Зөвхөн тоон утга буруу эсэхийг шалгана (хоосон эсвэл сөрөг) */
function isInvalid(kind: Kind, value: string): boolean {
  if (kind !== "number") return false;
  if (value.trim() === "") return true;
  const n = Number(value);
  return !Number.isFinite(n) || n < 0;
}

export default function ConfigPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [configs, setConfigs] = useState<Configs>({});
  const [drafts, setDrafts]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  function toggleSection(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  /* draft-ыг оригинал утгатай тэнцвэл цэвэрлэнэ — dirty tracking тодорхой байлгана */
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

  /* Хадгалаагүй өөрчлөлттэй үед хуудаснаас гарахаас сэргийлнэ */
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

  /* Configs-ийг group-аар хувиргана. "Бусад" group-д тохирохгүй key орно. */
  const grouped = useMemo(() => {
    const map = new Map<string, [string, ConfigEntry][]>();
    GROUPS.forEach((g) => map.set(g.key, []));
    map.set("other", []);

    const q = search.trim().toLowerCase();
    Object.entries(configs).forEach(([k, cfg]) => {
      if (q && !k.toLowerCase().includes(q) && !cfg.label.toLowerCase().includes(q)) return;
      const group = GROUPS.find((g) => g.match(k));
      (group ? map.get(group.key)! : map.get("other")!).push([k, cfg]);
    });
    map.forEach((items) => items.sort(([a], [b]) => a.localeCompare(b)));
    return map;
  }, [configs, search]);

  const visibleCount = useMemo(
    () => [...grouped.values()].reduce((n, items) => n + items.length, 0),
    [grouped],
  );
  const searching = search.trim().length > 0;

  /* Идэвхтэй (агуулгатай) section-уудын key — "бүгдийг нээх/хаах"-д хэрэгтэй */
  const sectionKeys = useMemo(
    () => [...grouped.entries()].filter(([, items]) => items.length > 0).map(([k]) => k),
    [grouped],
  );
  const allOpen = sectionKeys.length > 0 && sectionKeys.every((k) => openKeys.has(k));
  function toggleAll() {
    setOpenKeys(allOpen ? new Set() : new Set(sectionKeys));
  }

  function renderSection(g: Pick<Group, "key" | "title" | "subtitle" | "icon">) {
    const items = grouped.get(g.key) ?? [];
    if (items.length === 0) return null;
    const dirtyInSection = items.filter(([k]) => drafts[k] !== undefined).length;
    /* Хайлт хийж байх эсвэл хадгалаагүй өөрчлөлттэй бол хүчээр нээнэ */
    const open = searching || dirtyInSection > 0 || openKeys.has(g.key);
    return (
      <ConfigSection
        key={g.key}
        icon={g.icon} title={g.title} subtitle={g.subtitle}
        count={items.length} dirtyCount={dirtyInSection}
        open={open} onToggle={() => toggleSection(g.key)}
      >
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
      </ConfigSection>
    );
  }

  return (
    <div>
      <PageHeader
        title="Системийн тохиргоо"
        subtitle="Багцын үнэ, төхөөрөмжийн хязгаар, OTP, төлбөр зэрэг системийн тохиргоо"
      />

      {/* Search + expand/collapse all */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Тохиргоо хайх"
            placeholder="Тохиргооны нэрээр хайх…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {searching && (
            <button type="button" onClick={() => setSearch("")} aria-label="Хайлт цэвэрлэх"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        {!searching && !loading && Object.keys(configs).length > 0 && (
          <Button variant="ghost" size="sm" onClick={toggleAll} className="shrink-0">
            {allOpen ? "Бүгдийг хаах" : "Бүгдийг нээх"}
          </Button>
        )}
      </div>

      {loading ? (
        <ConfigSkeleton />
      ) : Object.keys(configs).length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
          Тохиргоо бүртгэгдээгүй байна
        </div>
      ) : searching && visibleCount === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
          <span className="font-mono text-fg">“{search}”</span>-д тохирох тохиргоо олдсонгүй
        </div>
      ) : (
        <>
          {searching && (
            <p className="text-xs text-muted mb-3" aria-live="polite">{visibleCount} илэрц</p>
          )}
          <div className="space-y-6">
            {GROUPS.map((g) => renderSection(g))}
            {renderSection({ key: "other", title: "Бусад", subtitle: "Тусгай ангилалд орохгүй", icon: Settings })}
          </div>
        </>
      )}

      {/* Sticky bulk-save bar — хадгалаагүй өөрчлөлт байх үед л гарна */}
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

/* ════════════════════════════════════════════════════ */
function ConfigSection({
  icon: Icon, title, subtitle, count, dirtyCount, open, onToggle, children,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  count: number;
  dirtyCount: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = useId();
  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden shadow-card">
      {/* Утасны Settings-маягийн дарж нээх толгой */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
      >
        <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={16} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            <Badge tone="neutral" className="text-[11px]">{count}</Badge>
            {dirtyCount > 0 && (
              <Badge tone="warning" className="text-[11px]">{dirtyCount} өөрчлөлт</Badge>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>
        </div>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="divide-y divide-border border-t border-border">
          {children}
        </div>
      )}
    </section>
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
  const kind    = valueKind(configKey, entry.value);
  const suffix  = getSuffix(configKey);
  const invalid = isInvalid(kind, draft);

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

/* edited үед брэнд цэнхэр border нэмнэ (амбер биш — brand accent) */
function cnEdited(edited: boolean, base: string): string {
  return `${base}${edited ? " border-primary focus:border-primary" : ""}`;
}

function ConfigSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {[0, 1].map((s) => (
        <div key={s} className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Skeleton className="w-9 h-9" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {[0, 1, 2].map((r) => (
              <div key={r} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-9 w-44" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
