import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import * as qpay from "../services/qpay.service";
import { activateSubscription } from "../services/subscription.service";
import { getSubscriptionPlans } from "../services/config.service";

export const paymentRouter = Router();

// Invoice үүсгэх
paymentRouter.post("/invoice", requireAuth, async (req, res, next) => {
  try {
    const { planType, period } = z.object({
      planType: z.enum(["STANDARD", "PREMIUM"]),
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

      const meta = payment.metadata as { planType: "STANDARD" | "PREMIUM"; period: "monthly" | "weekly" };
      await activateSubscription(payment.userId, meta.planType, meta.period, payment.id);
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
      const meta = payment.metadata as { planType: "STANDARD" | "PREMIUM"; period: "monthly" | "weekly" };
      await activateSubscription(payment.userId, meta.planType, meta.period, payment.id);
    }

    res.json({ success: true });
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
