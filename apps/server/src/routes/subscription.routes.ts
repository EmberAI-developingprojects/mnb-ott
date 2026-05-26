import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { getSubscriptionPlans } from "../services/config.service";
import { getMySubscriptionDetail, checkContentAccess, activateSubscription } from "../services/subscription.service";
import { notifySubscriptionActivated } from "../services/notification.service";
import { AppError } from "../middleware/error.middleware";

export const subscriptionRouter = Router();

// Боломжит планы (public)
subscriptionRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await getSubscriptionPlans();
    res.json({ success: true, data: { plans } });
  } catch (e) { next(e); }
});

// Миний subscription (auth)
subscriptionRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const detail = await getMySubscriptionDetail(req.user!.userId);
    res.json({ success: true, data: detail });
  } catch (e) { next(e); }
});

// Контент үзэх эрх шалгах (frontend-ээс gate-д ашиглана)
subscriptionRouter.post("/access", requireAuth, async (req, res, next) => {
  try {
    const { kind, vodId, contentId } = z.object({
      kind:      z.enum(["archive", "library", "bundle", "live-tv", "live"]),
      /* vodId — хуучин нэр (bundle-д), contentId — шинэ ерөнхий нэр (live эсвэл bundle) */
      vodId:     z.string().optional(),
      contentId: z.string().optional(),
    }).parse(req.body);

    const decision = await checkContentAccess(req.user!.userId, kind, contentId ?? vodId);
    res.json({ success: true, data: decision });
  } catch (e) { next(e); }
});

/**
 * Plan-ыг шууд идэвхжүүлэх (DEV / TEST горим).
 * QPay credentials байхгүй үед эсвэл process.env.PAYMENT_MODE === "mock" үед
 * хэрэглэхэд зориулсан. Production-д ENV-ээр хаах боломжтой.
 */
subscriptionRouter.post("/activate", requireAuth, async (req, res, next) => {
  try {
    const enabled =
      process.env.PAYMENT_MODE === "mock" ||
      !process.env.QPAY_USERNAME ||
      process.env.NODE_ENV !== "production";

    if (!enabled) {
      throw new AppError("Test activate is disabled in production", 403, "FORBIDDEN");
    }

    const { planType, period } = z.object({
      planType: z.literal("VOD"),
      period:   z.enum(["monthly", "weekly"]),
    }).parse(req.body);

    const { prisma } = await import("../lib/prisma");
    const plans = await getSubscriptionPlans();
    const plan  = plans.find((p) => p.type === planType);
    if (!plan) throw new AppError("Plan олдсонгүй", 404, "NOT_FOUND");
    const amount = period === "monthly" ? plan.priceMonthly : plan.priceWeekly;

    /* Худалдан авалтын түүхэнд харагдах Payment(PAID) record */
    await prisma.payment.create({
      data: {
        userId:   req.user!.userId,
        amount,
        status:   "PAID",
        paidAt:   new Date(),
        metadata: { kind: "PLAN", planType, period },
      },
    });

    const sub = await activateSubscription(req.user!.userId, planType, period, "MOCK_PAYMENT");

    if (plan && sub.expiresAt) {
      try { await notifySubscriptionActivated(req.user!.userId, plan.label, sub.expiresAt); }
      catch { /* notification алдаа silent */ }
    }

    const detail = await getMySubscriptionDetail(req.user!.userId);
    res.json({ success: true, data: detail });
  } catch (e) { next(e); }
});

/**
 * BASIC plan руу буцаах (захиалга цуцлах).
 * Шууд BASIC болгож хадгална — payment refund энд хийгдэхгүй.
 */
subscriptionRouter.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const { prisma } = await import("../lib/prisma");
    await prisma.subscription.update({
      where: { userId: req.user!.userId },
      data:  { planType: "BASIC", status: "CANCELLED", expiresAt: null },
    });
    const detail = await getMySubscriptionDetail(req.user!.userId);
    res.json({ success: true, data: detail });
  } catch (e) { next(e); }
});
