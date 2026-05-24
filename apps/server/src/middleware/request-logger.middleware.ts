import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

/* Request бүрд UUID олгож, бүх log entry-д хадгална.
   Алдаа гарах үед request ID-аар trace хийх боломжтой болно. */
export const requestLogger = pinoHttp({
  logger,

  /* x-request-id header байгаа бол ашиглана (load balancer-аас ирсэн), үгүй бол шинэ UUID */
  genReqId: (req, res) => {
    const id = (req.headers["x-request-id"] as string) ?? randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },

  /* Health endpoint лог бичихгүй — noise багасгана */
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/ready",
  },

  /* Custom serializers — request/response объектыг шахах */
  serializers: {
    req: (req) => ({
      id:     req.id,
      method: req.method,
      url:    req.url,
      ip:     req.headers["x-forwarded-for"] ?? req.remoteAddress,
      userId: (req.raw as { user?: { userId?: string } }).user?.userId,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  /* HTTP status code-аас log level автомат сонгох */
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
