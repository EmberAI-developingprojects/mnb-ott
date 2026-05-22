import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CONFIGS = [
  // ── 4 plan үнэ ────────────────────────────────────
  // BASIC үнэгүй учраас зөвхөн device_limit-тэй
  { key: "plan.basic.device_limit",     value: "1",     label: "BASIC: нэгэн зэрэг device" },

  { key: "plan.tv.price_monthly",       value: "9900",  label: "TV сарын үнэ (₮)" },
  { key: "plan.tv.price_weekly",        value: "3500",  label: "TV 7 хоногийн үнэ (₮)" },
  { key: "plan.tv.device_limit",        value: "2",     label: "TV: нэгэн зэрэг device" },

  { key: "plan.vod.price_monthly",      value: "12900", label: "VOD сарын үнэ (₮)" },
  { key: "plan.vod.price_weekly",       value: "4500",  label: "VOD 7 хоногийн үнэ (₮)" },
  { key: "plan.vod.device_limit",       value: "2",     label: "VOD: нэгэн зэрэг device" },

  { key: "plan.combo.price_monthly",    value: "19900", label: "COMBO сарын үнэ (₮)" },
  { key: "plan.combo.price_weekly",     value: "6900",  label: "COMBO 7 хоногийн үнэ (₮)" },
  { key: "plan.combo.device_limit",     value: "4",     label: "COMBO: нэгэн зэрэг device" },

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
