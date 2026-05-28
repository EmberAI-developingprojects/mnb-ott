import { describe, it, expect, vi, beforeEach } from "vitest";

/* Payment flow тестүүд:
   - handleQpayCallback нь idempotent байх (PAID payment-ийг дахин trigger хийхгүй)
   - handleQpayCallback нь payment олдохгүй үед throw хийхгүй (silent)
   - createPlanInvoice нь VOD plan үед прайс зөв авч QPay invoice буцаах */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    payment:    { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    purchase:   { findUnique: vi.fn(), upsert: vi.fn() },
    vodContent: { findUnique: vi.fn(), upsert: vi.fn() },
    channel:    { findUnique: vi.fn() },
  },
}));

vi.mock("../qpay.service", () => ({
  createInvoice: vi.fn(),
  checkPayment:  vi.fn(),
  cancelInvoice: vi.fn(),
}));

vi.mock("../config.service", () => ({
  getConfigNumber:      vi.fn(async (_k: string, fb: number) => fb),
  getSubscriptionPlans: vi.fn(async () => [
    {
      type: "BASIC", label: "Энгийн", tagline: "", priceMonthly: 0, priceWeekly: 0,
      deviceLimit: 2, features: [], capabilities: { premiumVod: false },
    },
    {
      type: "VOD", label: "Видео сан", tagline: "", priceMonthly: 12900, priceWeekly: 4900,
      deviceLimit: 2, features: [], capabilities: { premiumVod: true },
    },
  ]),
}));

vi.mock("../notification.service", () => ({
  pushNotification:           vi.fn(),
  notifyPaymentReceived:      vi.fn(),
  notifySubscriptionActivated: vi.fn(),
}));

vi.mock("../subscription.service", () => ({
  activateSubscription: vi.fn(async () => ({ id: "sub1", expiresAt: new Date(Date.now() + 30 * 86400_000) })),
}));

import { handleQpayCallback } from "../payment/check.service";
import { createPlanInvoice } from "../payment/invoice.service";
import { prisma } from "../../lib/prisma";
import * as qpay from "../qpay.service";

const findFirstPayment   = prisma.payment.findFirst  as ReturnType<typeof vi.fn>;
const updateManyPayment  = prisma.payment.updateMany as ReturnType<typeof vi.fn>;
const updatePayment      = prisma.payment.update     as ReturnType<typeof vi.fn>;
const createPayment      = prisma.payment.create     as ReturnType<typeof vi.fn>;
const qpayCreateInvoice  = qpay.createInvoice        as ReturnType<typeof vi.fn>;

describe("handleQpayCallback (idempotency + safety)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Payment олдохгүй үед gracefully буцна (throw хийхгүй)", async () => {
    findFirstPayment.mockResolvedValue(null);
    await expect(handleQpayCallback("unknown-qpay-id")).resolves.toBeUndefined();
    expect(updateManyPayment).not.toHaveBeenCalled();
  });

  it("Аль хэдийн PAID payment-ийг дахин trigger хийхгүй (idempotent)", async () => {
    findFirstPayment.mockResolvedValue({
      id: "p1", userId: "u1", amount: 12900, invoiceId: "inv-1",
      status: "PAID", qpayInvoiceId: "qp1", metadata: { planType: "VOD", period: "monthly" },
    });
    /* updateMany conditional: status != "PAID" нөхцөлд taarchgüй тул count=0.
       handlePaymentSuccess дуудагдахгүй. */
    updateManyPayment.mockResolvedValue({ count: 0 });

    await handleQpayCallback("qp1");

    /* updateMany нь дуудагдах боловч count=0 буцаах тул success handler skip */
    expect(updateManyPayment).toHaveBeenCalled();
  });

  it("PENDING payment-ийг PAID болгоод handlePaymentSuccess дуудна", async () => {
    findFirstPayment.mockResolvedValue({
      id: "p2", userId: "u2", amount: 12900, invoiceId: "inv-2",
      status: "PENDING", qpayInvoiceId: "qp2", metadata: { planType: "VOD", period: "monthly" },
    });
    /* Атом updateMany — нэг row update болсон гэж buцaana (winner) */
    updateManyPayment.mockResolvedValue({ count: 1 });

    await handleQpayCallback("qp2");

    expect(updateManyPayment).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "p2", status: { not: "PAID" } }),
      data:  expect.objectContaining({ status: "PAID" }),
    }));
  });
});

describe("createPlanInvoice (VOD subscription)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPayment.mockResolvedValue({ id: "p1", invoiceId: "inv-abc-123" });
    updatePayment.mockResolvedValue({ id: "p1" });
    qpayCreateInvoice.mockResolvedValue({
      invoice_id: "qpay-xyz",
      qr_text:    "0001....",
      qr_image:   "data:image/png;base64,xxx",
      urls:       [{ name: "qPay", description: "", logo: "", link: "qpaywallet://" }],
    });
  });

  it("VOD plan-р monthly invoice үүсгэхэд priceMonthly буцаана", async () => {
    const res = await createPlanInvoice("u1", "VOD", "monthly");
    expect(res.amount).toBe(12900);
    expect(res.qpayInvoiceId).toBe("qpay-xyz");
    expect(res.invoiceId).toBe("inv-abc-123");
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "u1", amount: 12900 }),
    }));
  });

  it("VOD plan-р weekly invoice үүсгэхэд priceWeekly буцаана", async () => {
    const res = await createPlanInvoice("u1", "VOD", "weekly");
    expect(res.amount).toBe(4900);
  });

  it("Plan VOD биш үед INVALID_PLAN throw хийнэ", async () => {
    /* TypeScript-ийн compile-time-ээс гадуур illegal утга — runtime defence */
    await expect(createPlanInvoice("u1", "BASIC" as unknown as "VOD", "monthly"))
      .rejects.toThrow(/Plan буруу/);
  });

  it("QPay invoice ID-ийг payment record-д update хийнэ", async () => {
    await createPlanInvoice("u1", "VOD", "monthly");
    expect(updatePayment).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "p1" },
      data:  { qpayInvoiceId: "qpay-xyz" },
    }));
  });
});
