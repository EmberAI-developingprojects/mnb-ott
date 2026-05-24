import { describe, it, expect, vi } from "vitest";
import { generateOtp, sendSms } from "../sms.service";

/* SMS service нь mock-тэй (SMS_MOCK=true). Бодит axios дуудлага хийхгүй. */

describe("generateOtp", () => {
  it("6 оронтой numeric string буцаана", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("Дуудлага бүрт өөр код буцаана (random)", () => {
    const codes = new Set(Array.from({ length: 10 }).map(() => generateOtp()));
    expect(codes.size).toBeGreaterThan(5); /* 10-аас 5+ нь өвөрмөц байх */
  });
});

describe("sendSms — mock mode", () => {
  it("SMS_MOCK=true бол console.log болоод буцана (axios call үгүй)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendSms("99000000", "Test message");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[SMS MOCK]"));
    spy.mockRestore();
  });
});
