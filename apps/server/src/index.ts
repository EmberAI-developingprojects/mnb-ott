import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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
import { ensureDefaultConfigs } from "./services/config-seed.service";

const app = express();
const httpServer = createServer(app);

/* Client (FRONTEND_URL) + Admin (ADMIN_URL) хоёулангаас зөвшөөрнө.
   ALLOWED_ORIGINS env-ээр давхар comma-separated хэлбэрээр өргөтгөж болно. */
const allowedOrigins: string[] = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter((o): o is string => Boolean(o));

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    /* origin байхгүй = same-origin/curl/server-to-server → зөвшөөрнө */
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} зөвшөөрөлгүй`));
  },
  credentials: true,
};

export const io = new Server(httpServer, { cors: corsOptions });

/* Reverse proxy (nginx, fly.io, render г.м.) ард ажиллах үед X-Forwarded-For-оос
   жинхэнэ IP-г унших — express-rate-limit IP-р хязгаарлахын тулд шаардлагатай */
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

/* Liveness — процесс ажиллаж буй эсэхийг шалгана (load balancer-д хангалттай) */
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

/* Readiness — DB + Redis dependency-той бэлэн эсэх. K8s readiness probe-д
   ашиглах ёстой. Аль нэг dependency offline бол 503 буцаана. */
app.get("/ready", async (_req, res) => {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  /* Prisma — энгийн query */
  try {
    const { prisma } = await import("./lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    checks.database = { ok: false, error: (e as Error).message };
  }

  /* Redis — ping */
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

app.use(errorMiddleware);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, async () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  /* Анхны системийн тохиргоо хоосон үед автомат seed */
  try {
    await ensureDefaultConfigs();
  } catch (e) {
    console.error("Config seed failed:", e);
  }
});
