import {
  Package, Tv, Smartphone, ShoppingBag,
  KeyRound, CreditCard, Building2, Settings, Radio,
} from "lucide-react";
import type { SelectOption } from "@/components/ui/Select";

/* Config групп — `/config` хуудаст карт хэлбэрээр харагдана,
   тус бүр `/config/[key]` руу залгана. */
export interface Group {
  key:      string;
  title:    string;
  subtitle: string;
  icon:     typeof Package;
  match:    (key: string) => boolean;
}

export const GROUPS: Group[] = [
  { key: "plan-price",   title: "Багцын үнэ",            subtitle: "VOD plan-ийн сар, 7 хоногийн үнэ",            icon: Package,     match: (k) => k.startsWith("plan.") && k.includes(".price") },
  { key: "device-limit", title: "Төхөөрөмжийн хязгаар",  subtitle: "Нэгэн зэрэг хэдэн төхөөрөмжөөс нэвтрэх вэ",   icon: Smartphone,  match: (k) => k.includes("device_limit") },
  { key: "live-ppv",     title: "LIVE event PPV",        subtitle: "LIVE event худалдан авсны дараах үзэх хугацаа", icon: Radio,     match: (k) => k.startsWith("live.") },
  { key: "bundle",       title: "Багц видео (Түрээс)",   subtitle: "TVOD — багцын видеог тус бүрчлэн түрээслэх",  icon: ShoppingBag, match: (k) => k.startsWith("bundle.") || k.startsWith("tvod.") },
  { key: "dvr",          title: "DVR — Catch-up",        subtitle: "Live TV өнгөрсөн цацалтыг буцаан үзэх",       icon: Tv,          match: (k) => k.startsWith("dvr.") },
  { key: "otp",          title: "OTP / Нэвтрэлт",        subtitle: "Баталгаажуулах кодын тохиргоо",               icon: KeyRound,    match: (k) => k.startsWith("otp.") },
  { key: "payment",      title: "Төлбөр",                subtitle: "QPay горим, refund бодлого",                  icon: CreditCard,  match: (k) => k.startsWith("payment.") },
  { key: "branding",     title: "Брэнд / Дэмжлэг",       subtitle: "Дэмжлэгийн утас, и-мэйл",                     icon: Building2,   match: (k) => k.startsWith("branding.") },
];

export const OTHER_GROUP: Group = {
  key: "other", title: "Бусад", subtitle: "Тусгай ангилалд орохгүй",
  icon: Settings, match: () => true,
};

/* Тодорхой key-нүүдийн enum сонголтууд (free-text биш) */
export const ENUM_OPTIONS: Record<string, SelectOption[]> = {
  "payment.mode": [
    { value: "mock", label: "Mock — тест горим" },
    { value: "live", label: "QPay — бодит" },
  ],
};

/* Утгын суффикс — input баруун талд visual hint */
export function getSuffix(key: string): string | null {
  if (key.includes(".price"))       return "₮";
  if (key.includes("_minutes"))     return "мин";
  if (key.includes("_hours"))       return "цаг";
  if (key.includes("_days"))        return "хоног";
  if (key.includes("device_limit")) return "төх.";
  if (key.includes(".length"))      return "тэмд.";
  return null;
}

export type Kind = "boolean" | "enum" | "number" | "text";

export function valueKind(key: string, value: string): Kind {
  if (ENUM_OPTIONS[key]) return "enum";
  if (value === "true" || value === "false") return "boolean";
  if (/(price|limit|minutes|hours|days|length|count)/.test(key)) return "number";
  return "text";
}

export function isInvalid(kind: Kind, value: string): boolean {
  if (kind !== "number") return false;
  if (value.trim() === "") return true;
  const n = Number(value);
  return !Number.isFinite(n) || n < 0;
}
