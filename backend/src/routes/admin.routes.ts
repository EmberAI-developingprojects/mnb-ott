import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { getAllConfigs, updateConfig } from "../services/config.service";
import { AppError } from "../middleware/error.middleware";

export const adminRouter = Router();

// Бүх config авах (ADMIN+)
adminRouter.get("/config", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), async (_req, res, next) => {
  try {
    const configs = await getAllConfigs();
    res.json({ success: true, data: { configs } });
  } catch (e) { next(e); }
});

// Config шинэчлэх (ADMIN+)
adminRouter.patch("/config/:key", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = z.object({ value: z.string() }).parse(req.body);

    const all = await getAllConfigs();
    if (!all[key]) throw new AppError("Config олдсонгүй", 404, "NOT_FOUND");

    await updateConfig(key, value);
    res.json({ success: true, data: { key, value } });
  } catch (e) { next(e); }
});
