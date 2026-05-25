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

export type PlanCapability = {
  /** YouTube архив (үнэгүй VOD) үзэх боломж */
  youtubeArchive: boolean;
  /** Live TV (5 суваг) + DVR catch-up */
  liveTv: boolean;
  /** Премиум VOD сан (DRM хамгаалалттай) */
  premiumVod: boolean;
};

export interface PlanDefinition {
  type: "BASIC" | "TV" | "VOD" | "COMBO";
  label: string;
  tagline: string;
  priceMonthly: number;
  priceWeekly: number;
  deviceLimit: number;
  features: string[];
  capabilities: PlanCapability;
}

// 4 plan + ердийн TVOD (тусдаа видео багц) — capabilities нь access control-д ашиглагдана
export async function getSubscriptionPlans(): Promise<PlanDefinition[]> {
  const cfg = await getAllConfigs();
  const n = (k: string, fb: number) => Number(cfg[k]?.value ?? fb);

  return [
    {
      type: "BASIC",
      label: "Энгийн",
      tagline: "Нэвтэрсэн бол YouTube архив үнэгүй",
      priceMonthly: 0,
      priceWeekly: 0,
      deviceLimit: n("plan.basic.device_limit", 1),
      features: [
        "YouTube архив бүх видео",
        "Мэдээний клип, шоунууд",
        "1 төхөөрөмж зэрэг",
        "Багц доторх видеог тус бүрчлэн түрээслэх боломжтой",
      ],
      capabilities: { youtubeArchive: true, liveTv: false, premiumVod: false },
    },
    {
      type: "TV",
      label: "ТВ",
      tagline: "5 суваг шууд + DVR catch-up",
      priceMonthly: n("plan.tv.price_monthly", 9900),
      priceWeekly:  n("plan.tv.price_weekly",  3500),
      deviceLimit:  n("plan.tv.device_limit",  2),
      features: [
        "5 суваг шууд (LIVE)",
        "DVR 2 цаг catch-up",
        "EPG хөтөлбөр (3 хойш / 5 урагш өдөр)",
        "YouTube архив",
      ],
      capabilities: { youtubeArchive: true, liveTv: true, premiumVod: false },
    },
    {
      type: "VOD",
      label: "Видео сан",
      tagline: "Санг бүхэлд нь сараар захиалаад хязгааргүй үзнэ",
      priceMonthly: n("plan.vod.price_monthly", 12900),
      priceWeekly:  n("plan.vod.price_weekly",  4500),
      deviceLimit:  n("plan.vod.device_limit",  2),
      features: [
        "Видео сан дотор хязгааргүй үзэх",
        "HD/4K чанар",
        "DRM хамгаалалт",
        "YouTube архив",
      ],
      capabilities: { youtubeArchive: true, liveTv: false, premiumVod: true },
    },
    {
      type: "COMBO",
      label: "Бүгд",
      tagline: "ТВ + Видео сан хосолсон бүх багц",
      priceMonthly: n("plan.combo.price_monthly", 19900),
      priceWeekly:  n("plan.combo.price_weekly",  6900),
      deviceLimit:  n("plan.combo.device_limit",  4),
      features: [
        "Бүх суваг шууд (LIVE) + DVR",
        "Видео сан хязгааргүй",
        "HD/4K, DRM",
        "4 төхөөрөмж зэрэг",
        "EPG хөтөлбөр",
      ],
      capabilities: { youtubeArchive: true, liveTv: true, premiumVod: true },
    },
  ];
}

export async function getPlanCapabilities(
  planType: "BASIC" | "TV" | "VOD" | "COMBO",
): Promise<PlanCapability> {
  const plans = await getSubscriptionPlans();
  const plan  = plans.find((p) => p.type === planType) ?? plans[0];
  return plan.capabilities;
}
