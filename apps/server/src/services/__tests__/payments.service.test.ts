import { describe, it, expect, vi, beforeEach } from "vitest";

/* Admin refund flow тест — refund нь зөвхөн PAID статустайг REFUNDED болгодог,
   audit бичигдэдэг гэдгийг шалгана. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    payment:  { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { refundPayment } from "../admin/payments.service";
import { prisma } from "../../lib/prisma";

const findPayment   = prisma.payment.findUnique as ReturnType<typeof vi.fn>;
const updatePayment = prisma.payment.update as ReturnType<typeof vi.fn>;
const createAudit   = prisma.auditLog.create as ReturnType<typeof vi.fn>;

describe("refundPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePayment.mockResolvedValue({ id: "p1", status: "REFUNDED", amount: 19900 });
    createAudit.mockResolvedValue({});
  });

  it("PAID статустай төлбөрийг REFUNDED болгоно", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "PAID", amount: 19900 });
    const r = await refundPayment("admin1", "p1", "Хэрэглэгчийн хүсэлт");
    expect(r.status).toBe("REFUNDED");
    expect(updatePayment).toHaveBeenCalledWith({
      where: { id: "p1" },
      data:  { status: "REFUNDED" },
    });
  });

  it("Refund хийхэд audit log бичигдэнэ", async () => {
    findPayment.mockResolvedValue({ id: "p1", status: "PAID", amount: 19900 });
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
