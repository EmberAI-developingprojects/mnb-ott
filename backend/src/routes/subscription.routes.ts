import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { getSubscriptionPlans } from "../services/config.service";
import { getMySubscriptionDetail } from "../services/subscription.service";

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
