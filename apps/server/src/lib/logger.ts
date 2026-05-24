import pino from "pino";
import { env } from "./env";

/* Pino-аар structured JSON log. Development-д human-readable, production-д
   single-line JSON (CloudWatch / Datadog-д хайхад тохиромжтой). */

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: env.LOG_LEVEL,

  /* Dev: pino-pretty-аар хүн уншигдахуйц format */
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize:     true,
          translateTime: "SYS:standard",
          ignore:       "pid,hostname",
          singleLine:   false,
        },
      }
    : undefined,

  /* Production-д sensitive талбаруудыг redact хийнэ */
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.qpay_password",
      "*.SMTP_PASS",
      "*.JWT_SECRET",
      "*.DATABASE_URL",
    ],
    censor: "[REDACTED]",
  },

  /* Production-д үндсэн context */
  base: isDev ? undefined : {
    app:     "mnb-ott-server",
    env:     env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});
