import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CONFIGS = [
  // ── Subscription үнэ ──────────────────────────────
  { key: "plan.standard.price_monthly", value: "9900",  label: "Standard сарын үнэ (₮)" },
  { key: "plan.standard.price_weekly",  value: "3500",  label: "Standard 7 хоногийн үнэ (₮)" },
  { key: "plan.premium.price_monthly",  value: "19900", label: "Premium сарын үнэ (₮)" },
  { key: "plan.premium.price_weekly",   value: "6900",  label: "Premium 7 хоногийн үнэ (₮)" },

  // ── Device хязгаар ───────────────────────────────
  { key: "plan.free.device_limit",      value: "1",  label: "Free: нэгэн зэрэг device тоо" },
  { key: "plan.standard.device_limit",  value: "2",  label: "Standard: нэгэн зэрэг device тоо" },
  { key: "plan.premium.device_limit",   value: "5",  label: "Premium: нэгэн зэрэг device тоо" },

  // ── TVOD ─────────────────────────────────────────
  { key: "tvod.rental_hours",           value: "72", label: "TVOD түрээсийн хугацаа (цаг)" },

  // ── DVR ──────────────────────────────────────────
  { key: "dvr.window_days",             value: "7",  label: "DVR ухрааж үзэх хоног" },

  // ── Гишүүнчлэл ───────────────────────────────────
  { key: "trial.days",                  value: "0",  label: "Үнэгүй trial хоног (0 = байхгүй)" },
];

async function main() {
  console.log("Seeding system config...");
  for (const cfg of DEFAULT_CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { label: cfg.label },  // value-г дахин бичихгүй (admin өөрчилсөн байж болно)
      create: cfg,
    });
  }
  console.log(`✓ ${DEFAULT_CONFIGS.length} config seeded`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
