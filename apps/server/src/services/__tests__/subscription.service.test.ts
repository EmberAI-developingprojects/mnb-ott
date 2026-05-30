import { describe, it, expect, vi, beforeEach } from "vitest";

/* checkContentAccess нь plan/access decision-ийн төв логик.
   Шинэ v2 загвар (2026-05): TV/Radio + archive нь нэвтэрсэн бүхэнд үнэгүй.
   LIVE event-үүд PPV (Purchase by channelId). Премиум VOD сан зөвхөн VOD plan-той. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn(), create: vi.fn() },
    purchase:     { findUnique: vi.fn() },
    user:         { count: vi.fn() },
  },
}));

/* Redis mock — getMySubscription одоо cache ашигладаг. get → null (cache miss)
   буцааж DB-руу унагаана, set/del → no-op. */
vi.mock("../../lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("../config.service", () => ({
  getSubscriptionPlans: vi.fn().mockResolvedValue([
    { type: "BASIC", capabilities: { premiumVod: false } },
    { type: "VOD",   capabilities: { premiumVod: true  } },
  ]),
  getConfigNumber: vi.fn().mockResolvedValue(0),
}));

import { checkContentAccess } from "../subscription.service";
import { prisma } from "../../lib/prisma";

describe("checkContentAccess — шинэ access control matrix (v2)", () => {
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

  it("BASIC plan archive үзэх боломжтой (нэвтэрсэн бүхэнд free)", async () => {
    mockSub("BASIC");
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
  });

  it("BASIC plan TV/Radio (live-tv) үзэх боломжтой — шинэ загварт үнэгүй", async () => {
    mockSub("BASIC");
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
  });

  it("BASIC plan library үзэхгүй — VOD plan шаардлагатай", async () => {
    mockSub("BASIC");
    const d = await checkContentAccess("u1", "library");
    expect(d.allowed).toBe(false);
    expect(d.requiredPlans).toEqual(["VOD"]);
  });

  it("VOD plan бүгдийг үзнэ (archive, live-tv, library)", async () => {
    mockSub("VOD");
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "library")).allowed).toBe(true);
  });

  it("Legacy COMBO plan → шинэ системд VOD-той адил (premium)", async () => {
    mockSub("COMBO");
    expect((await checkContentAccess("u1", "library")).allowed).toBe(true);
  });

  it("Legacy TV plan → шинэ системд BASIC-тай адил (premium хаалттай)", async () => {
    mockSub("TV");
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "library")).allowed).toBe(false);
  });

  it("Хугацаа дууссан VOD plan → premium VOD-д хандахгүй (downgrade)", async () => {
    mockSub("VOD", new Date(Date.now() - 86400000));
    expect((await checkContentAccess("u1", "library")).allowed).toBe(false);
    /* archive + live-tv нь үнэгүй тул хэвээр үзнэ */
    expect((await checkContentAccess("u1", "archive")).allowed).toBe(true);
    expect((await checkContentAccess("u1", "live-tv")).allowed).toBe(true);
  });

  it("Bundle видео: idэвхтэй Purchase байгаа бол үзнэ", async () => {
    mockSub("BASIC");
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1", vodId: "v1", status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400000),
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
      expiresAt: new Date(Date.now() - 3600000),
    });
    const d = await checkContentAccess("u1", "bundle", "v1");
    expect(d.allowed).toBe(false);
  });

  it("LIVE PPV: idэвхтэй Purchase by channelId байгаа бол үзнэ", async () => {
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1", channelId: "c1", status: "ACTIVE",
      expiresAt: new Date(Date.now() + 12 * 3600_000),
    });
    const d = await checkContentAccess("u1", "live", "c1");
    expect(d.allowed).toBe(true);
  });

  it("LIVE PPV: Purchase байхгүй → PURCHASE_REQUIRED", async () => {
    (prisma.purchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const d = await checkContentAccess("u1", "live", "c1");
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("PURCHASE_REQUIRED");
  });
});
