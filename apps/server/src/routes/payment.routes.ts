import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import * as qpay from "../services/qpay.service";
import * as payment from "../services/payment";

export const paymentRouter = Router();

/* SVOD plan invoice — шинэ загварт зөвхөн VOD plan боломжтой */
paymentRouter.post("/invoice", requireAuth, async (req, res, next) => {
  try {
    const { planType, period } = z.object({
      planType: z.literal("VOD"),
      period:   z.enum(["monthly", "weekly"]),
    }).parse(req.body);

    const data = await payment.createPlanInvoice(req.user!.userId, planType, period);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

/* LIVE event PPV — Channel.id-аар худалдан авна (24 цаг) */
paymentRouter.post("/live-invoice", requireAuth, async (req, res, next) => {
  try {
    const { channelId } = z.object({ channelId: z.string() }).parse(req.body);
    const data = await payment.createLiveInvoice(req.user!.userId, channelId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

/* Hand-poll status check */
paymentRouter.post("/check", requireAuth, async (req, res, next) => {
  try {
    const { invoiceId } = z.object({ invoiceId: z.string() }).parse(req.body);
    const data = await payment.checkPaymentStatus(req.user!.userId, invoiceId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

/* QPay webhook (auth header-ээр шалгана) */
paymentRouter.post("/callback", async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!qpay.verifyCallback(auth)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { payment_id } = z.object({ payment_id: z.string() }).parse(req.body);
    await payment.handleQpayCallback(payment_id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* TVOD — нэг VOD-ыг 72 цагаар түрээслэх */
paymentRouter.post("/vod-invoice", requireAuth, async (req, res, next) => {
  try {
    const { vodId, price, title } = z.object({
      vodId: z.string(),
      price: z.number().int().min(100),
      title: z.string().optional(),
    }).parse(req.body);

    const data = await payment.createVodInvoice(req.user!.userId, vodId, price, title);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

/* Invoice цуцлах */
paymentRouter.delete("/invoice/:invoiceId", requireAuth, async (req, res, next) => {
  try {
    await payment.cancelInvoice(req.user!.userId, req.params.invoiceId);
    res.json({ success: true, data: { cancelled: true } });
  } catch (e) { next(e); }
});

/* Худалдан авалтын түүх */
paymentRouter.get("/history", requireAuth, async (req, res, next) => {
  try {
    const items = await payment.getPaymentHistory(req.user!.userId);
    res.json({ success: true, data: { items } });
  } catch (e) { next(e); }
});

