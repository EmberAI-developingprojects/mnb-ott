/* Startup-д env validation хийнэ — алдаа байвал процесс шууд унтарна. */
import { env, loadEnv } from "./lib/env";
loadEnv();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.routes";
import { channelRouter } from "./routes/channel.routes";
import { vodRouter } from "./routes/vod.routes";
import { paymentRouter } from "./routes/payment.routes";
import { subscriptionRouter } from "./routes/subscription.routes";
import { searchRouter } from "./routes/search.routes";
import { adminRouter } from "./routes/admin.routes";
import { notificationRouter } from "./routes/notification.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { adminLimiter } from "./middleware/rate-limit.middleware";
import { requestLogger } from "./middleware/request-logger.middleware";
import { logger } from "./lib/logger";
import { initSentry, Sentry } from "./lib/sentry";
import { ensureDefaultConfigs } from "./services/config-seed.service";

initSentry();

const app = express();
const httpServer = createServer(app);

/* Client (FRONTEND_URL) + Admin (ADMIN_URL) хоёулангаас зөвшөөрнө.
   ALLOWED_ORIGINS env-ээр давхар comma-separated хэлбэрээр өргөтгөж болно. */
const allowedOrigins: string[] = [
  env.FRONTEND_URL,
  env.ADMIN_URL,
  ...(env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter((o): o is string => Boolean(o));

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} зөвшөөрөлгүй`));
  },
  credentials: true,
};

export const io = new Server(httpServer, { cors: corsOptions });

/* Reverse proxy ард ажиллах үед X-Forwarded-For-оос жинхэнэ IP-г унших */
app.set("trust proxy", 1);

/* ─── Security headers ──────────────────────────────────
   CSP — XSS, clickjacking-аас хамгаална. YouTube iframe, Cloudinary,
   Google OAuth, S3 thumbnail-уудыг whitelist-д оруулсан. */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.googleapis.com", "https://accounts.google.com"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https://i.ytimg.com", "https://img.youtube.com", "https://res.cloudinary.com", "https://lh3.googleusercontent.com", "https://*.s3.amazonaws.com", env.CDN_BASE_URL].filter(Boolean) as string[],
      mediaSrc:   ["'self'", "https://*.s3.amazonaws.com", env.CDN_BASE_URL, "blob:"].filter(Boolean) as string[],
      connectSrc: ["'self'", "https://www.googleapis.com", "https://accounts.google.com", "https://*.supabase.co", env.CDN_BASE_URL].filter(Boolean) as string[],
      frameSrc:   ["'self'", "https://www.youtube.com", "https://accounts.google.com"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, /* YouTube iframe-тэй сертификат */
}));

app.use(cors(corsOptions));
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* Liveness — процесс ажиллаж буй эсэхийг шалгана */
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

/* Readiness — DB + Redis dependency бэлэн эсэх. K8s readiness probe-д. */
app.get("/ready", async (_req, res) => {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  try {
    const { prisma } = await import("./lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    checks.database = { ok: false, error: (e as Error).message };
  }

  try {
    const { redis } = await import("./lib/redis");
    const pong = await redis.ping();
    checks.redis = { ok: pong === "PONG" };
  } catch (e) {
    checks.redis = { ok: false, error: (e as Error).message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    success: allOk,
    data: { status: allOk ? "ready" : "degraded", checks },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/channels", channelRouter);
app.use("/api/vod", vodRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/search", searchRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/notifications", notificationRouter);

/* Sentry error handler нь errorMiddleware-аас өмнө */
if (env.SENTRY_DSN) {
  app.use((err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Sentry.captureException(err);
    next(err);
  });
}

app.use(errorMiddleware);

httpServer.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `🚀 Backend running on http://localhost:${env.PORT}`);
  try {
    await ensureDefaultConfigs();
  } catch (e) {
    logger.error({ err: e }, "Config seed failed");
  }
});

/* Graceful shutdown — Sentry buffer-ийг flush хийгээд процессыг хаах */
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");
  if (env.SENTRY_DSN) await Sentry.close(2000);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
