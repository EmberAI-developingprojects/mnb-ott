import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import * as qpay from "../services/qpay.service";
import { activateSubscription } from "../services/subscription.service";
import { getSubscriptionPlans, getConfigNumber } from "../services/config.service";
import { notifyPaymentReceived, notifySubscriptionActivated, pushNotification } from "../services/notification.service";

type PlanMeta = { kind?: "PLAN"; planType: "TV" | "VOD" | "COMBO"; period: "monthly" | "weekly" };
type VodMeta  = { kind: "VOD";  vodId: string; title?: string };
type AnyMeta  = PlanMeta | VodMeta;

async function handlePaymentSuccess(payment: { id: string; userId: string; amount: number; invoiceId: string; metadata: unknown }) {
  const meta = (payment.metadata ?? {}) as AnyMeta;

  if ((meta as VodMeta).kind === "VOD") {
    // Нэг VOD-ыг 72 цагаар түрээслэв
    const { vodId, title } = meta as VodMeta;
    const hours = await getConfigNumber("tvod.rental_hours", 72);
    const expiresAt = new Date(Date.now() + hours * 3600_000);
    await prisma.purchase.upsert({
      where:  { userId_vodId: { userId: payment.userId, vodId } },
      update: { status: "ACTIVE", expiresAt, amount: payment.amount },
      create: { userId: payment.userId, vodId, amount: payment.amount, expiresAt },
    });
    await pushNotification({
      userId: payment.userId, type: "CONTENT",
      title:  `${title ?? "Видео"} түрээслэгдлээ`,
      body:   `${hours} цагийн дотор үзэх боломжтой.`,
      link:   `/vod/${vodId}`,
    });
  } else {
    const planMeta = meta as PlanMeta;
    const sub = await activateSubscription(payment.userId, planMeta.planType, planMeta.period, payment.id);
    const plans = await getSubscriptionPlans();
    const plan  = plans.find((p) => p.type === planMeta.planType);
    if (plan && sub.expiresAt) {
      await notifySubscriptionActivated(payment.userId, plan.label, sub.expiresAt);
    }
  }
  await notifyPaymentReceived(payment.userId, payment.amount, payment.invoiceId);
}

export const paymentRouter = Router();

// Invoice үүсгэх
paymentRouter.post("/invoice", requireAuth, async (req, res, next) => {
  try {
    const { planType, period } = z.object({
      planType: z.enum(["TV", "VOD", "COMBO"]),
      period:   z.enum(["monthly", "weekly"]),
    }).parse(req.body);

    const plans = await getSubscriptionPlans();
    const plan  = plans.find((p) => p.type === planType);
    if (!plan) throw new AppError("Plan олдсонгүй", 404, "NOT_FOUND");

    const amount = period === "monthly" ? plan.priceMonthly : plan.priceWeekly;

    // Payment DB-д бүртгэх
    const payment = await prisma.payment.create({
      data: {
        userId:   req.user!.userId,
        amount,
        metadata: { planType, period },
      },
    });

    // QPay invoice үүсгэх
    const invoice = await qpay.createInvoice({
      invoiceId:   payment.invoiceId,
      amount,
      description: `МҮОНРТ OTT ${plan.label} (${period === "monthly" ? "сарын" : "7 хоногийн"})`,
      callbackUrl: `${process.env.QPAY_CALLBACK_URL}`,
    });

    // qpayInvoiceId хадгалах
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { qpayInvoiceId: invoice.invoice_id },
    });

    res.json({
      success: true,
      data: {
        paymentId:     payment.id,
        invoiceId:     payment.invoiceId,
        qpayInvoiceId: invoice.invoice_id,
        qrText:        invoice.qr_text,
        qrImage:       invoice.qr_image,
        deeplinks:     invoice.urls,
        amount,
      },
    });
  } catch (e) { next(e); }
});

// Төлбөр шалгах
paymentRouter.post("/check", requireAuth, async (req, res, next) => {
  try {
    const { invoiceId } = z.object({ invoiceId: z.string() }).parse(req.body);

    const payment = await prisma.payment.findUnique({ where: { invoiceId } });
    if (!payment || payment.userId !== req.user!.userId) {
      throw new AppError("Invoice олдсонгүй", 404, "NOT_FOUND");
    }
    if (payment.status === "PAID") {
      return res.json({ success: true, data: { paid: true, status: "PAID" } });
    }
    if (!payment.qpayInvoiceId) {
      throw new AppError("QPay invoice ID байхгүй", 400, "BAD_REQUEST");
    }

    const paid = await qpay.checkPayment(payment.qpayInvoiceId);
    if (paid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data:  { status: "PAID", paidAt: new Date() },
      });
      await handlePaymentSuccess(payment);
    }

    res.json({ success: true, data: { paid, status: paid ? "PAID" : "PENDING" } });
  } catch (e) { next(e); }
});

// QPay webhook (автомат callback)
paymentRouter.post("/callback", async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!qpay.verifyCallback(auth)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { payment_id } = z.object({ payment_id: z.string() }).parse(req.body);
    const payment = await prisma.payment.findFirst({ where: { qpayInvoiceId: payment_id } });

    if (payment && payment.status !== "PAID") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date() } });
      await handlePaymentSuccess(payment);
    }

    res.json({ success: true });
  } catch (e) { next(e); }
});

// Mock горим эсэхийг шалгах helper
function isMockPayment(): boolean {
  return process.env.PAYMENT_MODE === "mock" ||
         !process.env.QPAY_USERNAME ||
         !process.env.QPAY_BASE_URL;
}

// Нэг VOD-ыг 72 цагаар түрээслэх invoice
paymentRouter.post("/vod-invoice", requireAuth, async (req, res, next) => {
  try {
    const { vodId, price, title } = z.object({
      vodId: z.string(),
      price: z.number().int().min(100),
      title: z.string().optional(),
    }).parse(req.body);

    // Аль хэдийн түрээслэсэн идэвхтэй Purchase эсэх
    const owned = await prisma.purchase.findUnique({
      where: { userId_vodId: { userId: req.user!.userId, vodId } },
    });
    if (owned && owned.status === "ACTIVE" &&
        (!owned.expiresAt || owned.expiresAt > new Date())) {
      throw new AppError("Аль хэдийн түрээслэсэн", 400, "ALREADY_RENTED");
    }

    /* MOCK МОДЕ — QPay байхгүй үед шууд Purchase + Payment(PAID) үүсгэнэ */
    if (isMockPayment()) {
      const hours = await getConfigNumber("tvod.rental_hours", 72);
      const expiresAt = new Date(Date.now() + hours * 3600_000);

      const payment = await prisma.payment.create({
        data: {
          userId:   req.user!.userId,
          amount:   price,
          status:   "PAID",
          paidAt:   new Date(),
          metadata: { kind: "VOD", vodId, title },
        },
      });

      await prisma.purchase.upsert({
        where:  { userId_vodId: { userId: req.user!.userId, vodId } },
        update: { status: "ACTIVE", expiresAt, amount: price },
        create: { userId: req.user!.userId, vodId, amount: price, expiresAt },
      });

      try {
        await pushNotification({
          userId: req.user!.userId, type: "CONTENT",
          title:  `${title ?? "Видео"} түрээслэгдлээ`,
          body:   `${hours} цагийн дотор үзэх боломжтой.`,
          link:   `/vod/${vodId}`,
        });
      } catch { /* silent */ }

      return res.json({
        success: true,
        data: { mock: true, paid: true, paymentId: payment.id, invoiceId: payment.invoiceId, amount: price },
      });
    }

    /* PRODUCTION — QPay invoice */
    const payment = await prisma.payment.create({
      data: {
        userId:   req.user!.userId,
        amount:   price,
        metadata: { kind: "VOD", vodId, title },
      },
    });

    const invoice = await qpay.createInvoice({
      invoiceId:   payment.invoiceId,
      amount:      price,
      description: `МҮОНРТ түрээс: ${title ?? vodId}`,
      callbackUrl: `${process.env.QPAY_CALLBACK_URL}`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data:  { qpayInvoiceId: invoice.invoice_id },
    });

    res.json({
      success: true,
      data: {
        mock: false,
        paymentId:     payment.id,
        invoiceId:     payment.invoiceId,
        qpayInvoiceId: invoice.invoice_id,
        qrText:        invoice.qr_text,
        qrImage:       invoice.qr_image,
        deeplinks:     invoice.urls,
        amount:        price,
      },
    });
  } catch (e) { next(e); }
});

// Invoice цуцлах
paymentRouter.delete("/invoice/:invoiceId", requireAuth, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { invoiceId: req.params.invoiceId } });
    if (!payment || payment.userId !== req.user!.userId) {
      throw new AppError("Invoice олдсонгүй", 404, "NOT_FOUND");
    }
    if (payment.qpayInvoiceId) await qpay.cancelInvoice(payment.qpayInvoiceId);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    res.json({ success: true, data: { cancelled: true } });
  } catch (e) { next(e); }
});

/* Худалдан авалтын түүх — захиалга + VOD purchase */
paymentRouter.get("/history", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const [payments, purchases] = await Promise.all([
      prisma.payment.findMany({
        where: { userId, status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 100,
      }),
      prisma.purchase.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { vod: true },
        take: 100,
      }),
    ]);

    /* Frontend-д ойлгомжтой form-аар нэгтгэнэ */
    const items = [
      ...payments.map((p) => {
        const meta = (p.metadata ?? {}) as Record<string, unknown>;
        return {
          id:        p.id,
          type:      meta.kind === "VOD" ? "vod_rental" : "subscription",
          title:     meta.kind === "VOD"
                      ? (meta.title as string) ?? "Видео түрээс"
                      : `${(meta.planType as string) ?? "Plan"} (${meta.period ?? ""})`,
          amount:    p.amount,
          status:    p.status,
          paidAt:    p.paidAt,
          createdAt: p.createdAt,
          method:    p.provider,
        };
      }),
      ...purchases
        .filter((pp) => !payments.some((pay) => {
          const m = (pay.metadata ?? {}) as Record<string, unknown>;
          return m.kind === "VOD" && m.vodId === pp.vodId;
        }))
        .map((pp) => ({
          id:        pp.id,
          type:      "vod_rental",
          title:     pp.vod.title,
          amount:    pp.amount,
          status:    pp.status,
          paidAt:    pp.createdAt,
          createdAt: pp.createdAt,
          expiresAt: pp.expiresAt,
          method:    "manual",
        })),
    ];

    items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    res.json({ success: true, data: { items } });
  } catch (e) { next(e); }
});
