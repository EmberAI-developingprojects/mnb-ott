import rateLimit, { type Options } from "express-rate-limit";

/* express-rate-limit-ийг ашиглан OTP/login brute-force-оос хамгаалах middleware-ууд.
   IP суурьтай (proxy ард ажиллах үед `app.set('trust proxy', 1)` хэрэгтэй).
   Test mode-д disable: NODE_ENV=test үед автоматаар алгасна. */

const isTest = process.env.NODE_ENV === "test";

const baseConfig: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  skip:            () => isTest,
  handler: (_req, res, _next, opts) => {
    res.status(opts.statusCode).json({
      success: false,
      code:    "RATE_LIMITED",
      message: "Хэт олон хүсэлт ирлээ. Хэдэн минутын дараа дахин оролдоно уу.",
    });
  },
};

/* OTP илгээх (register init, forgot password, phone OTP send) —
   5 удаа / 15 мин / IP. Нэг утсыг/email-ийг spam хийхэд хязгаар тавина. */
export const otpSendLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit:    5,
});

/* OTP баталгаажуулах (register verify, verify-otp, reset-password) —
   10 удаа / 15 мин. Кодыг brute-force-оор таахаас урьдчилан сэргийлнэ. */
export const otpVerifyLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit:    10,
});

/* Нэвтрэлт (password login) — 10 удаа / 15 мин / IP. */
export const loginLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit:    10,
});

/* Нууц үг шинэчилэх — нэвтэрсэн хэрэглэгчээс гадна IP-р, илүү уян хатан. */
export const passwordChangeLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000,
  limit:    10,
});

/* Admin endpoints — user list scraping, batch role change brute force-оос
   хамгаалах. 60 req/min/IP — хэвийн admin-ын ачаалал хүртэх боловч bot хязгаарлана. */
export const adminLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  limit:    60,
});
