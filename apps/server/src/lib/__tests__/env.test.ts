import { describe, it, expect } from "vitest";
import { loadEnv } from "../env";

/* env validation-ыг шалгана. setup.ts-ээс үндсэн env-ууд тогтоогдсон,
   тиймээс энд validation амжилттай ажиллахыг л баталгаажуулна. */

describe("loadEnv", () => {
  it("Шаардлагатай env байгаа үед амжилттай parse болно", () => {
    expect(() => loadEnv()).not.toThrow();
  });

  it("Зөв NODE_ENV утга буцаана (test setup-аас)", () => {
    const env = loadEnv();
    expect(env.NODE_ENV).toBe("test");
  });

  it("Дефолт утгуудыг тогтооно", () => {
    const env = loadEnv();
    expect(env.JWT_EXPIRES_IN).toBe("1h");
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe("30d");
    expect(env.PAYMENT_MODE).toBe("mock");
    expect(env.DVR_WINDOW_HOURS).toBe(2);
  });

  it("LOG_LEVEL test setup-аас 'error'", () => {
    const env = loadEnv();
    expect(env.LOG_LEVEL).toBe("error");
  });
});
