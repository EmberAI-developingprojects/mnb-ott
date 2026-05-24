import { z } from "zod";

/* Startup-д бүх env-уудыг шалгадаг schema. Дутуу/буруу утга байвал процесс
   эхлэхгүй, тодорхой алдааны мэдээлэлтэй унтарна. Энэ нь "production-д
   environment variable дутуу байснаас 500 error буцаах" асуудлаас сэргийлнэ. */

const envSchema = z.object({
  /* ─── Орчин ───────────────────────────────────────── */
  NODE_ENV:  z.enum(["development", "test", "production"]).default("development"),
  PORT:      z.coerce.number().default(3001),

  /* ─── DB / Cache (заавал) ─────────────────────────── */
  DATABASE_URL: z.string().url(),
  DIRECT_URL:   z.string().url().optional(),
  REDIS_URL:    z.string(),

  /* ─── Auth (заавал) ───────────────────────────────── */
  JWT_SECRET:              z.string().min(32, "JWT_SECRET 32+ тэмдэгт байх ёстой"),
  JWT_EXPIRES_IN:          z.string().default("1h"),
  JWT_REFRESH_EXPIRES_IN:  z.string().default("30d"),

  /* ─── Origins (CORS) ──────────────────────────────── */
  FRONTEND_URL:     z.string().url().default("http://localhost:3000"),
  ADMIN_URL:        z.string().url().default("http://localhost:3002"),
  ALLOWED_ORIGINS:  z.string().optional(),

  /* ─── Google OAuth (сонголтоор) ───────────────────── */
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /* ─── SMS (production-д заавал) ───────────────────── */
  SMS_GATEWAY_URL:  z.string().optional(),
  SMS_API_KEY:      z.string().optional(),
  SMS_SENDER_ID:    z.string().optional(),
  SMS_MOCK:         z.enum(["true", "false"]).default("false"),

  /* ─── Email SMTP (production-д заавал) ────────────── */
  SMTP_HOST:    z.string().optional(),
  SMTP_PORT:    z.coerce.number().optional(),
  SMTP_USER:    z.string().optional(),
  SMTP_PASS:    z.string().optional(),
  SMTP_FROM:    z.string().optional(),
  EMAIL_MOCK:   z.enum(["true", "false"]).optional(),

  /* ─── S3 / CDN ────────────────────────────────────── */
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION:            z.string().optional(),
  S3_BUCKET_NAME:        z.string().optional(),
  CDN_BASE_URL:          z.string().url().optional(),

  /* ─── YouTube (заавал — public архив feature-д шаардлагатай) ─── */
  YOUTUBE_API_KEY:           z.string(),
  MNB_YOUTUBE_CHANNEL_ID:    z.string().optional(),
  YOUTUBE_CHANNEL_IDS:       z.string().optional(),

  /* ─── QPay (production-д заавал) ──────────────────── */
  QPAY_BASE_URL:       z.string().url().optional(),
  QPAY_USERNAME:       z.string().optional(),
  QPAY_PASSWORD:       z.string().optional(),
  QPAY_INVOICE_CODE:   z.string().optional(),
  QPAY_CALLBACK_URL:   z.string().url().optional(),
  PAYMENT_MODE:        z.enum(["mock", "qpay", "live"]).default("mock"),

  /* ─── Streaming ───────────────────────────────────── */
  DVR_WINDOW_HOURS:        z.coerce.number().default(2),
  HLS_SEGMENT_DURATION:    z.coerce.number().default(6),
  FFMPEG_PATH:             z.string().optional(),

  /* ─── Sentry / Observability ──────────────────────── */
  SENTRY_DSN:           z.string().url().optional(),
  LOG_LEVEL:            z.enum(["fatal","error","warn","info","debug","trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Environment validation алдаа:");
    for (const issue of parsed.error.issues) {
      console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Шаардлагатай env utga дутуу. Дээрх мэдээллийг шалгаад .env файлаа засна уу.");
  }

  /* Production дотор хорьсон тохиргоонуудыг шалгах */
  if (parsed.data.NODE_ENV === "production") {
    const errors: string[] = [];
    if (parsed.data.PAYMENT_MODE === "mock") errors.push("PAYMENT_MODE=mock-ыг production-д ашиглаж болохгүй");
    if (parsed.data.SMS_MOCK === "true")     errors.push("SMS_MOCK=true-г production-д ашиглаж болохгүй");
    if (!parsed.data.SMTP_HOST)               errors.push("Production-д SMTP_HOST заавал шаардлагатай");
    if (!parsed.data.SMS_API_KEY)             errors.push("Production-д SMS_API_KEY заавал шаардлагатай");
    if (parsed.data.JWT_SECRET.length < 64)   errors.push("Production-д JWT_SECRET 64+ тэмдэгт байх ёстой");

    if (errors.length > 0) {
      console.error("❌ Production environment-д тохирохгүй тохиргоо:");
      for (const e of errors) console.error(`   ${e}`);
      throw new Error("Production launch урьдчилан зөвшөөрөгдөхгүй config олдов.");
    }
  }

  cached = parsed.data;
  return cached;
}

/* Convenience getter — `env.JWT_SECRET` шиг ашиглах */
export const env = new Proxy({} as Env, {
  get: (_, key: string) => loadEnv()[key as keyof Env],
});
