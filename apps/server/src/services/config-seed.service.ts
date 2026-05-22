import { prisma } from "../lib/prisma";

/* Анхны SystemConfig утгуудыг (хоосон үед) DB-руу оруулна.
   Backend эхэлж ажиллах үед нэг удаа дуудна — байгаа утгуудыг ХӨНДӨХГҮЙ. */

interface ConfigSeed {
  key:   string;
  label: string;
  value: string;
}

const DEFAULTS: ConfigSeed[] = [
  /* ─── Plan үнэ — сар ─── */
  { key: "plan.tv.price_monthly",     label: "ТВ багц — сарын үнэ (₮)",       value: "9900"  },
  { key: "plan.vod.price_monthly",    label: "Видео сан — сарын үнэ (₮)",     value: "12900" },
  { key: "plan.combo.price_monthly",  label: "Бүгд багц — сарын үнэ (₮)",     value: "19900" },

  /* ─── Plan үнэ — 7 хоног ─── */
  { key: "plan.tv.price_weekly",      label: "ТВ багц — 7 хоногийн үнэ (₮)",  value: "3500"  },
  { key: "plan.vod.price_weekly",     label: "Видео сан — 7 хоногийн үнэ (₮)",value: "4500"  },
  { key: "plan.combo.price_weekly",   label: "Бүгд багц — 7 хоногийн үнэ (₮)",value: "6900"  },

  /* ─── Device limit (нэг хэрэглэгчид нэгэн зэрэг хэдэн төхөөрөмж нэвтрэх вэ) ─── */
  { key: "plan.basic.device_limit",   label: "Энгийн — төхөөрөмжийн хязгаар", value: "1" },
  { key: "plan.tv.device_limit",      label: "ТВ — төхөөрөмжийн хязгаар",      value: "2" },
  { key: "plan.vod.device_limit",     label: "Видео сан — төхөөрөмжийн хязгаар",value: "2" },
  { key: "plan.combo.device_limit",   label: "Бүгд — төхөөрөмжийн хязгаар",    value: "4" },

  /* ─── Bundle (TVOD) — нэг видеоны түрээсийн үнэ + хугацаа ─── */
  { key: "bundle.rent_duration_hours",label: "Багц видеоны түрээсийн хугацаа (цаг)", value: "72" },
  { key: "bundle.default_price",      label: "Багц видеоны үндсэн үнэ (₮)",   value: "2900" },

  /* ─── DVR ─── */
  { key: "dvr.window_hours",          label: "DVR (catch-up) цонхны хэмжээ (цаг)",   value: "2" },

  /* ─── OTP / Auth ─── */
  { key: "otp.length",                label: "OTP кодын урт (тэмдэгт)",         value: "6"  },
  { key: "otp.ttl_minutes",           label: "OTP-ийн хүчинтэй хугацаа (минут)", value: "10" },

  /* ─── Payment ─── */
  { key: "payment.mode",              label: "Төлбөрийн горим (mock | qpay)",   value: "mock" },
  { key: "payment.refund_window_days",label: "Төлбөр буцаах хугацаа (хоног)",   value: "7" },

  /* ─── Branding ─── */
  { key: "branding.support_email",    label: "Дэмжлэгийн и-мэйл",               value: "support@mnb.mn" },
  { key: "branding.support_phone",    label: "Дэмжлэгийн утас",                  value: "1900-0123" },
];

export async function ensureDefaultConfigs(): Promise<void> {
  const existing = await prisma.systemConfig.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((e) => e.key));

  const missing = DEFAULTS.filter((d) => !existingKeys.has(d.key));
  if (missing.length === 0) return;

  await prisma.systemConfig.createMany({
    data: missing,
    skipDuplicates: true,
  });

  console.log(`✓ SystemConfig: ${missing.length} default key seeded`);
}
