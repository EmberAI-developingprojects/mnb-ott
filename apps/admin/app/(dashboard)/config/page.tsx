"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Package, Tv, Smartphone, ShoppingBag,
  Clock, KeyRound, CreditCard, Building2, Settings,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { useRoleGuard } from "@/components/admin/AuthGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

interface ConfigEntry {
  value: string;
  label: string;
}
type Configs = Record<string, ConfigEntry>;

/* Config key-ийг харьяа категори болгож хувиргана.
   key prefix-ээр сэдэвчилнэ. */
interface Group {
  key:      string;
  title:    string;
  subtitle: string;
  icon:     typeof Package;
  match:    (key: string) => boolean;
}

const GROUPS: Group[] = [
  {
    key:      "plan-price",
    title:    "Багцын үнэ",
    subtitle: "TV / VOD / COMBO багцын сар, 7 хоногийн үнэ",
    icon:     Package,
    match:    (k) => k.startsWith("plan.") && k.includes(".price"),
  },
  {
    key:      "device-limit",
    title:    "Төхөөрөмжийн хязгаар",
    subtitle: "Нэгэн зэрэг хэдэн төхөөрөмжөөс нэвтрэх вэ",
    icon:     Smartphone,
    match:    (k) => k.includes("device_limit"),
  },
  {
    key:      "bundle",
    title:    "Багц видео (Түрээс)",
    subtitle: "TVOD — багцын видеог тус бүрчлэн түрээслэх",
    icon:     ShoppingBag,
    match:    (k) => k.startsWith("bundle."),
  },
  {
    key:      "dvr",
    title:    "DVR — Catch-up",
    subtitle: "Live TV өнгөрсөн цацалтыг буцаан үзэх",
    icon:     Tv,
    match:    (k) => k.startsWith("dvr."),
  },
  {
    key:      "otp",
    title:    "OTP / Нэвтрэлт",
    subtitle: "Баталгаажуулах кодын тохиргоо",
    icon:     KeyRound,
    match:    (k) => k.startsWith("otp."),
  },
  {
    key:      "payment",
    title:    "Төлбөр",
    subtitle: "QPay горим, refund бодлого",
    icon:     CreditCard,
    match:    (k) => k.startsWith("payment."),
  },
  {
    key:      "branding",
    title:    "Брэнд / Дэмжлэг",
    subtitle: "Дэмжлэгийн утас, и-мэйл",
    icon:     Building2,
    match:    (k) => k.startsWith("branding."),
  },
];

/* Утгын суффикс — input баруун талд харагдана (visual hint, value-д орохгүй) */
function getSuffix(key: string): string | null {
  if (key.includes(".price"))         return "₮";
  if (key.includes("_minutes"))       return "мин";
  if (key.includes("_hours"))         return "цаг";
  if (key.includes("_days"))          return "хоног";
  if (key.includes("device_limit"))   return "төх.";
  if (key.includes(".length"))        return "тэмд.";
  return null;
}

/* Утгын төрлийн badge */
function valueType(key: string): "currency" | "number" | "text" | "toggle" {
  if (key.includes(".mode"))        return "text";
  if (/(price|limit|minutes|hours|days|length|count)/.test(key)) return "number";
  if (key.includes("email") || key.includes("phone")) return "text";
  return "text";
}

export default function ConfigPage() {
  useRoleGuard(["ADMIN", "SUPER_ADMIN"]);
  const [configs, setConfigs]   = useState<Configs>({});
  const [drafts, setDrafts]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await api.get<ApiResponse<{ configs: Configs }>>("/api/admin/config");
    setConfigs(r.data.data.configs);
    setDrafts({});
    setLoading(false);
  }

  async function handleSave(key: string) {
    setSaving(key);
    try {
      await api.patch(`/api/admin/config/${key}`, { value: drafts[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1800);
      toast.success("Хадгалагдлаа");
      await load();
    } catch (e) {
      toast.error(getApiError(e).message);
    } finally {
      setSaving(null);
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
      const bucket = group ? map.get(group.key)! : map.get("other")!;
      bucket.push([k, cfg]);
    });

    /* Тухайн group дотроо key-аар sort */
    map.forEach((items) => items.sort(([a], [b]) => a.localeCompare(b)));
    return map;
  }, [configs, search]);

  return (
    <div>
      <PageHeader
        title="Системийн тохиргоо"
        subtitle="Багцын үнэ, device limit, OTP, төлбөр зэрэг dynamic тохиргоо"
      />

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input placeholder="Тохиргооны нэрээр хайх..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Уншиж байна...</p>
      ) : Object.keys(configs).length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
          Config бүртгэлгүй
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const items = grouped.get(g.key) ?? [];
            if (items.length === 0) return null;
            const Icon = g.icon;
            return (
              <ConfigSection key={g.key} icon={Icon} title={g.title} subtitle={g.subtitle} count={items.length}>
                {items.map(([key, cfg]) => (
                  <ConfigRow
                    key={key}
                    configKey={key}
                    entry={cfg}
                    draft={drafts[key] ?? cfg.value}
                    saving={saving === key}
                    saved={savedKey === key}
                    onChange={(v) => setDrafts({ ...drafts, [key]: v })}
                    onSave={() => handleSave(key)}
                  />
                ))}
              </ConfigSection>
            );
          })}

          {/* "Бусад" group */}
          {(grouped.get("other") ?? []).length > 0 && (
            <ConfigSection icon={Settings} title="Бусад" subtitle="Тусгай ангилалд орохгүй" count={(grouped.get("other") ?? []).length}>
              {(grouped.get("other") ?? []).map(([key, cfg]) => (
                <ConfigRow
                  key={key}
                  configKey={key}
                  entry={cfg}
                  draft={drafts[key] ?? cfg.value}
                  saving={saving === key}
                  saved={savedKey === key}
                  onChange={(v) => setDrafts({ ...drafts, [key]: v })}
                  onSave={() => handleSave(key)}
                />
              ))}
            </ConfigSection>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
function ConfigSection({
  icon: Icon, title, subtitle, count, children,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-fg">{title}</h2>
              <Badge tone="neutral" className="text-[10px]">{count}</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function ConfigRow({
  configKey, entry, draft, saving, saved, onChange, onSave,
}: {
  configKey: string;
  entry: ConfigEntry;
  draft: string;
  saving: boolean;
  saved: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  const edited = draft !== entry.value;
  const suffix = getSuffix(configKey);
  const type = valueType(configKey);

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-bg transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{entry.label}</p>
        <p className="text-[11px] text-muted font-mono mt-0.5 truncate">{configKey}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <Input
            type={type === "number" ? "number" : "text"}
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            className={`w-40 text-right ${suffix ? "pr-12" : ""} ${edited ? "border-warning" : ""}`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <Button size="sm" disabled={!edited} loading={saving} onClick={onSave}>
          {saved ? "✓" : "Хадгалах"}
        </Button>
      </div>
    </div>
  );
}
