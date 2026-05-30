import { describe, it, expect, vi, beforeEach } from "vitest";

/* Admin refund flow тест — refund нь зөвхөн PAID статустайг REFUNDED болгодог,
   audit бичигдэдэг гэдгийг шалгана. */

vi.mock("../../lib/prisma", () => {
  const payment      = { findUnique: vi.fn(), update: vi.fn() };
  const purchase     = { updateMany: vi.fn() };
  const subscription = { updateMany: vi.fn() };
  const auditLog     = { create: vi.fn() };
  return {
    prisma: {
      payment, purchase, subscription, auditLog,
      /* $transaction(fn) — callback-д tx (ижил prisma proxy) дамжуулна */
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({ payment, purchase, subscription })),
    },
  };
});

/* refund нь PLAN кейст subscription.service.invalidateSubscriptionCache-ийг
   dynamic import хийдэг — mock хийж бодит redis холболтоос зайлсхийнэ. */
vi.mock("../subscription.service", () => ({
  invalidateSubscriptionCache: vi.fn().mockResolvedValue(undefined),
}));

import { refundPayment } from "../admin/payments.service";
import { prisma } from "../../lib/prisma";

const findPayment   = prisma.payment.findUnique as ReturnType<typeof vi.fn>;
const updatePayment = prisma.payment.update as ReturnType<typeof vi.fn>;
const createAudit   = prisma.auditLog.create as ReturnType<typeof vi.fn>;
const updatePurchase     = prisma.purchase.updateMany as ReturnType<typeof vi.fn>;
const updateSubscription = prisma.subscription.updateMany as ReturnType<typeof vi.fn>;

describe("refundPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePayment.mockResolvedValue({ id: "p1", status: "REFUNDED", amount: 19900 });
    updatePurchase.mockResolvedValue({ count: 1 });
    updateSubscription.mockResolvedValue({ count: 1 });
    createAudit.mockResolvedValue({});
  });

  it("PAID статустай төлбөрийг REFUNDED болгоно", async () => {
    findPayment.mockResolvedValue({ id: "p1", userId: "u1", status: "PAID", amount: 19900, metadata: { kind: "VOD", vodId: "v1" } });
    const r = await refundPayment("admin1", "p1", "Хэрэглэгчийн хүсэлт");
    expect(r.status).toBe("REFUNDED");
    expect(updatePayment).toHaveBeenCalledWith({
      where: { id: "p1" },
      data:  { status: "REFUNDED" },
    });
    /* VOD refund нь холбогдох Purchase-ийг EXPIRED болгоно (access хаагдсан) */
    expect(updatePurchase).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "u1", vodId: "v1" }),
      data:  expect.objectContaining({ status: "EXPIRED" }),
    }));
  });

  it("Refund хийхэд audit log бичигдэнэ", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "PAID", amount: 19900, metadata: { kind: "PLAN", planType: "VOD", period: "monthly" } });
    await refundPayment("admin1", "p1", "Test reason", "127.0.0.1");
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action:       "REFUND",
        actorUserId:  "admin1",
        targetType:   "payment",
        targetId:     "p1",
        reason:       "Test reason",
      }),
    }));
  });

  it("PENDING статустайг refund хийж чадахгүй", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "PENDING", amount: 0 });
    await expect(refundPayment("admin1", "p1", "test")).rejects.toThrow();
  });

  it("FAILED статустайг refund хийж чадахгүй", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "FAILED", amount: 0 });
    await expect(refundPayment("admin1", "p1", "test")).rejects.toThrow();
  });

  it("Аль хэдийн REFUNDED-ыг дахин refund хийж чадахгүй", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "REFUNDED", amount: 19900 });
    await expect(refundPayment("admin1", "p1", "test")).rejects.toThrow();
  });

  it("Олдоогүй payment-руу refund хийвэл NOT_FOUND", async () => {
    findPayment.mockResolvedValue(null);
    await expect(refundPayment("admin1", "missing", "test")).rejects.toThrow();
  });
});
