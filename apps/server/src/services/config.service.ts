import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";

const CACHE_KEY = "system:config";
const CACHE_TTL = 5 * 60; // 5 минут

export async function getAllConfigs(): Promise<Record<string, { value: string; label: string }>> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const rows = await prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
  const result: Record<string, { value: string; label: string }> = {};
  for (const r of rows) result[r.key] = { value: r.value, label: r.label };

  await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);
  return result;
}

export async function getConfig(key: string): Promise<string | null> {
  const all = await getAllConfigs();
  return all[key]?.value ?? null;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const val = await getConfig(key);
  if (val == null || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export async function updateConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.update({ where: { key }, data: { value } });
  await redis.del(CACHE_KEY); // cache цэвэрлэнэ
}

/* Plan capability — шинэ бүтэц (v2):
   - youtubeArchive ба liveTv нь бүх нэвтэрсэн хэрэглэгчдэд үнэгүй болсон тул
     capability flag шаардлагагүй. Зөвхөн `premiumVod` нь plan-аас хамаарна.
   - LIVE event-үүд нь plan-аас гадуур TVOD (PPV) — Purchase шалгалтаар явна. */
export type PlanCapability = {
  /** Премиум VOD сан (DRM хамгаалалттай) */
  premiumVod: boolean;
};

export interface PlanDefinition {
  type:         "BASIC" | "VOD";
  label:        string;
  tagline:      string;
  priceMonthly: number;
  priceWeekly:  number;
  deviceLimit:  number;
  features:     string[];
  capabilities: PlanCapability;
}

/* Шинэ загвар: 2 plan л бий — BASIC (үнэгүй) + VOD (премиум сан).
   LIVE event-үүд тус бүрчлэн PPV (Purchase). Bundle хуучнаараа TVOD. */
export async function getSubscriptionPlans(): Promise<PlanDefinition[]> {
  const cfg = await getAllConfigs();
  const n = (k: string, fb: number) => Number(cfg[k]?.value ?? fb);

  return [
    {
      type: "BASIC",
      label: "Энгийн",
      tagline: "Нэвтэрсэн бол TV суваг, радио, архив бүгд үнэгүй",
      priceMonthly: 0,
      priceWeekly: 0,
      deviceLimit: n("plan.basic.device_limit", 2),
      features: [
        "5 TV суваг + 2 радио шууд",
        "DVR 2 цаг хойш үзэх",
        "YouTube архив бүх нэвтрүүлэг",
        "LIVE event-үүдийг тус бүрчлэн худалдан авч үзнэ",
      ],
      capabilities: { premiumVod: false },
    },
    {
      type: "VOD",
      label: "Видео сан",
      tagline: "Премиум санг сараар захиалж хязгааргүй үзнэ",
      priceMonthly: n("plan.vod.price_monthly", 12900),
      priceWeekly:  n("plan.vod.price_weekly",  4500),
      deviceLimit:  n("plan.vod.device_limit",  3),
      features: [
        "Премиум VOD сан дотор хязгааргүй",
        "HD/4K чанар",
        "DRM хамгаалалт",
        "BASIC plan-ийн бүх давуу талтай",
      ],
      capabilities: { premiumVod: true },
    },
  ];
}

/* Legacy TV / COMBO plan байгаа хуучин subscriber-ын хувьд:
   - TV    → шинэ системд BASIC (TV үнэгүй болсон тул)
   - COMBO → шинэ системд VOD (премиум үлдсэн) */
type AnyPlanType = "BASIC" | "TV" | "VOD" | "COMBO";
function normalize(plan: AnyPlanType): "BASIC" | "VOD" {
  if (plan === "VOD" || plan === "COMBO") return "VOD";
  return "BASIC";
}

export async function getPlanCapabilities(planType: AnyPlanType): Promise<PlanCapability> {
  const plans = await getSubscriptionPlans();
  const normalized = normalize(planType);
  const plan = plans.find((p) => p.type === normalized) ?? plans[0];
  return plan.capabilities;
}
