import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/* Auth service-ийн хамгийн чухал logic — refreshTokens болон loginWithPassword
   хоёуланг нь cover хийнэ. Production-д 500 алдаатай байсан refreshTokens-ийн
   regression-ийг catch хийхэд гол анхаарал. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user:        { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    userSession: {
      upsert:     vi.fn(),
      update:     vi.fn(),
      findFirst:  vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: { upsert: vi.fn() },
  },
}));

vi.mock("../sms.service",   () => ({ sendSms: vi.fn(), generateOtp: vi.fn(() => "123456") }));
vi.mock("../email.service", () => ({ sendOtpEmail: vi.fn() }));
vi.mock("../../lib/redis",  () => ({ redis: { setex: vi.fn(), get: vi.fn(), del: vi.fn() } }));

import { refreshTokens, loginWithPassword } from "../auth.service";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

describe("auth.service.refreshTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("хүчингүй token-д INVALID_REFRESH_TOKEN throw хийнэ", async () => {
    await expect(refreshTokens("not-a-real-jwt"))
      .rejects.toThrow("Refresh token хүчингүй");
  });

  it("Session DB-д байхгүй үед SESSION_NOT_FOUND throw хийнэ", async () => {
    const token = jwt.sign(
      { userId: "u1", role: "USER", sessionId: "s-missing" },
      process.env.JWT_SECRET!,
    );
    (prisma.userSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(refreshTokens(token)).rejects.toThrow("Session олдсонгүй");
  });

  it("хүчинтэй token + active session үед шинэ token хос буцаана", async () => {
    const token = jwt.sign(
      { userId: "u1", role: "USER", sessionId: "s1" },
      process.env.JWT_SECRET!,
    );
    (prisma.userSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1", userId: "u1", isActive: true, refreshToken: token,
      user: { id: "u1", role: "USER" },
    });
    (prisma.userSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await refreshTokens(token);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    /* Refresh token rotation — DB-д шинэчилэгдэх ёстой */
    expect(prisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" } }),
    );
  });
});

describe("auth.service.loginWithPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const device = { deviceId: "web", deviceName: "Browser", deviceType: "web" };

  it("байхгүй хэрэглэгчид INVALID_CREDENTIALS throw хийнэ", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(loginWithPassword("test@example.com", "password", device))
      .rejects.toThrow();
  });

  it("буруу нууц үг үед INVALID_CREDENTIALS throw хийнэ", async () => {
    const hashed = await bcrypt.hash("real-password", 4);
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1", email: "test@example.com", password: hashed, role: "USER", isVerified: true,
    });

    await expect(loginWithPassword("test@example.com", "wrong-password", device))
      .rejects.toThrow();
  });

  it("зөв нууц үгээр амжилттай нэвтэрч token хос буцаана", async () => {
    const hashed = await bcrypt.hash("correct-password", 4);
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1", email: "test@example.com", password: hashed, role: "USER", isVerified: true,
    });
    (prisma.userSession.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1", userId: "u1", deviceId: "web",
    });
    (prisma.userSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await loginWithPassword("test@example.com", "correct-password", device);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });
});
