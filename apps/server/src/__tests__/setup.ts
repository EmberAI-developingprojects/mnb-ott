/* Test environment setup — DB/Redis-руу холбогдохгүй, бүх dependency-г mock хийнэ.
   NODE_ENV=test үед rate-limit middleware skip болно. */

process.env.NODE_ENV               = "test";
process.env.PORT                   = "3001";
process.env.DATABASE_URL           = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL              = "redis://localhost:6379";
process.env.JWT_SECRET             = "test-secret-for-jwt-signing-must-be-32-chars-or-more";
process.env.JWT_EXPIRES_IN         = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "30d";
process.env.YOUTUBE_API_KEY        = "test-key";
process.env.SMS_MOCK               = "true";
process.env.EMAIL_MOCK             = "true";
process.env.PAYMENT_MODE           = "mock";
process.env.LOG_LEVEL              = "error"; /* test-д шуугианлгүй */
