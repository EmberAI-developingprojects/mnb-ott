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
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

export async function updateConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.update({ where: { key }, data: { value } });
  await redis.del(CACHE_KEY); // cache цэвэрлэнэ
}

// Subscription plans-д ашиглах helper
export async function getSubscriptionPlans() {
  const cfg = await getAllConfigs();
  return [
    {
      type: "FREE",
      label: "Үнэгүй",
      priceMonthly: 0,
      priceWeekly: 0,
      deviceLimit: Number(cfg["plan.free.device_limit"]?.value ?? 1),
      features: ["YouTube VOD архив", "Мэдээний суваг"],
    },
    {
      type: "STANDARD",
      label: "Стандарт",
      priceMonthly: Number(cfg["plan.standard.price_monthly"]?.value ?? 9900),
      priceWeekly: Number(cfg["plan.standard.price_weekly"]?.value ?? 3500),
      deviceLimit: Number(cfg["plan.standard.device_limit"]?.value ?? 2),
      features: ["Бүх суваг LIVE", "DVR 7 хоног", "HD чанар", "2 device"],
    },
    {
      type: "PREMIUM",
      label: "Премиум",
      priceMonthly: Number(cfg["plan.premium.price_monthly"]?.value ?? 19900),
      priceWeekly: Number(cfg["plan.premium.price_weekly"]?.value ?? 6900),
      deviceLimit: Number(cfg["plan.premium.device_limit"]?.value ?? 5),
      features: ["Бүх суваг LIVE", "DVR 7 хоног", "4K чанар", "Premium VOD", "5 device", "DRM хамгаалалт"],
    },
  ];
}
