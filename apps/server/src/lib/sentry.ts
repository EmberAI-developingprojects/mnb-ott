import * as Sentry from "@sentry/node";
import { env } from "./env";
import { logger } from "./logger";

/* Sentry-ийг startup-д initialize. SENTRY_DSN env байхгүй бол идэвхгүй
   (dev горимд алдаагүй ажиллана). */

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.info("Sentry disabled (SENTRY_DSN тохируулагдаагүй)");
    return;
  }

  Sentry.init({
    dsn:         env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release:     process.env.npm_package_version,

    /* Performance monitoring — production-д 10%-ийг л sample */
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    /* Сонгомол server error-уудыг шүүх */
    ignoreErrors: [
      "AppError",          /* known business errors */
      "AbortError",
      "ECONNRESET",
    ],

    beforeSend(event) {
      /* User context-аас sensitive talбar арилгах */
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });

  logger.info("Sentry initialized");
}

export { Sentry };
