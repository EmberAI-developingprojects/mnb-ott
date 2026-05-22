/* Test environment setup — DB/Redis-руу холбогдохгүй, бүх dependency-г mock хийнэ.
   NODE_ENV=test үед rate-limit middleware skip болно (rate-limit.middleware.ts). */

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-for-jwt-signing-only";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "30d";
process.env.SMS_MOCK = "true";
process.env.EMAIL_MOCK = "true";
process.env.PAYMENT_MODE = "mock";
