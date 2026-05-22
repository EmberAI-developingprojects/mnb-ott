import { describe, it, expect, vi, beforeEach } from "vitest";

/* checkContentAccess нь plan/access decision-ийн төв логик.
   Prisma болон config-service-ийг mock хийгээд цэвэр unit test хийнэ. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    purchase:     { findUnique: vi.fn() },
    user:         { count: vi.fn() },
  },
}));

vi.mock("../config.service", () => ({
  getSubscriptionPlans: vi.fn().mockResolvedValue([
    { type: "BASIC", capabilities: { youtubeArchive: true,  liveTv: false, premiumVod: false } },
    { type: "TV",    capabilities: { youtubeArchive: true,  liveTv: true,  premiumVod: false } },
    { type: "VOD",   capabilities: { youtubeArchive: true,  liveTv: false, premiumVod: true  } },
    { type: "COMBO", capabilities: { youtubeArchive: true,  liveTv: true,  premiumVod: true  } },
  ]),
  getConfigNumber: vi.fn().mockResolvedValue(0),
}));

import { checkContentAccess } from "../subscription.service";
import { prisma } from "../../lib/prisma";

describe("checkContentAccess — access control matrix", () => {
  beforeEach(() => vi.clearAllMocks());

  function mockSub(planType: "BASIC" | "TV" | "VOD" | "COMBO", expiresAt: Date | null = null) {
    (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1", userId: "u1", planType, expiresAt, status: "ACTIVE", startedAt: new Date(),
    });
  }

  it("нэвтрээгүй (userId=null) хэрэглэгч ямар ч контентод хандах боломжгүй", async () => {
    const d = await checkContentAccess(null, "archive");
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("PLAN_REQUIRED");
  });

  it("BASIC plan archive үзэх боломжтой", async () => {
    mockSub("BASIC");
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
  });

  it("BASIC plan live-tv үзэх боломжгүй (TV эсвэл COMBO шаардлагатай)", async () => {
    mockSub("BASIC");
    const d = await checkContentAccess("u1", "live-tv");
    expect(d.allowed).toBe(false);
    expect(d.requiredPlans).toEqual(["TV", "COMBO"]);
  });

  it("TV plan live-tv үзнэ, library биш", async () => {
    mockSub("TV");
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
    const lib = await checkContentAccess("u1", "library");
    expect(lib.allowed).toBe(false);
    expect(lib.requiredPlans).toEqual(["VOD", "COMBO"]);
  });

  it("VOD plan library үзнэ, live-tv биш", async () => {
    mockSub("VOD");
    expect((await checkContentAccess("u1", "library")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(false);
  });

  it("COMBO plan бүх контент үзнэ", async () => {
    mockSub("COMBO");
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "library")).allowed).toBe(true);
  });

  it("Хугацаа дууссан plan-ыг BASIC шиг үздэг (downgrade)", async () => {
    mockSub("COMBO", new Date(Date.now() - 86400000)); // өчигдөр expired
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(false);
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
  });

  it("Bundle видео: idэвхтэй Purchase байгаа бол үзнэ", async () => {
    mockSub("BASIC");
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1", vodId: "v1", status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400000), // маргааш дуусна
    });
    const d = await checkContentAccess("u1", "bundle", "v1");
    expect(d.allowed).toBe(true);
  });

  it("Bundle видео: purchase-гүй бол PURCHASE_REQUIRED", async () => {
    mockSub("BASIC");
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const d = await checkContentAccess("u1", "bundle", "v1");
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("PURCHASE_REQUIRED");
  });

  it("Bundle видео: purchase хугацаа дууссан бол хандахгүй", async () => {
    mockSub("BASIC");
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1", vodId: "v1", status: "ACTIVE",
      expiresAt: new Date(Date.now() - 3600000), // 1 цагийн өмнө дууссан
    });
    const d = await checkContentAccess("u1", "bundle", "v1");
    expect(d.allowed).toBe(false);
  });
});
