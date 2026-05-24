import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { getAllConfigs, updateConfig } from "../services/config.service";
import * as admin from "../services/admin";
import { AppError } from "../middleware/error.middleware";

export const adminRouter = Router();

/* Бүх admin endpoint requireAuth-аар хамгаалагдсан.
   ADMIN+ = ADMIN, SUPER_ADMIN. EDITOR/OPERATOR-д контент-холбоотой endpoint нээлттэй (дотроо тэмдэглэсэн). */

const ADMIN_PLUS = ["ADMIN", "SUPER_ADMIN"] as const;
const CONTENT_ROLES = ["EDITOR", "ADMIN", "SUPER_ADMIN"] as const;

function ip(req: Request): string | undefined {
  return (req.ip || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0])?.trim();
}

async function send<T>(promise: Promise<T>, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await promise }); } catch (e) { next(e); }
}

/* ─── SYSTEM CONFIG (one-by-one — existing behaviour) ───── */
adminRouter.get("/config", requireAuth, requireRole(...ADMIN_PLUS), async (_req, res, next) => {
  try { res.json({ success: true, data: { configs: await getAllConfigs() } }); }
  catch (e) { next(e); }
});

adminRouter.patch("/config/:key", requireAuth, requireRole(...ADMIN_PLUS), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = z.object({ value: z.string() }).parse(req.body);
    const all = await getAllConfigs();
    if (!all[key]) throw new AppError("Config олдсонгүй", 404, "NOT_FOUND");
    await updateConfig(key, value);
    res.json({ success: true, data: { key, value } });
  } catch (e) { next(e); }
});

/* ─── DASHBOARD STATS ───────────────────────────────────── */
adminRouter.get("/stats", requireAuth, requireRole(...ADMIN_PLUS), (_req, res, next) =>
  send(admin.getDashboardStats(), res, next),
);

/* Сүүлийн 7 хоногийн орлогын тренд (chart-д ашиглах) */
adminRouter.get("/stats/revenue-trend", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const q = z.object({ days: z.coerce.number().min(1).max(90).optional() }).parse(req.query);
  return send(admin.getRevenueTrend(q.days), res, next);
});

/* ─── USERS ─────────────────────────────────────────────── */
adminRouter.get("/users", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const q = z.object({
    search:   z.string().optional(),
    role:     z.enum(["USER", "EDITOR", "OPERATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
    page:     z.coerce.number().optional(),
    pageSize: z.coerce.number().optional(),
  }).parse(req.query);
  return send(admin.listUsers(q), res, next);
});

adminRouter.get("/users/:id", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) =>
  send(admin.getUserDetail(req.params.id), res, next),
);

adminRouter.patch("/users/:id/role", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const body = z.object({
    role: z.enum(["USER", "EDITOR", "OPERATOR", "ADMIN", "SUPER_ADMIN"]),
  }).parse(req.body);
  return send(admin.changeUserRole({
    actorUserId:  req.user!.userId,
    actorRole:    req.user!.role,
    targetUserId: req.params.id,
    newRole:      body.role,
    ip:           ip(req),
  }), res, next);
});

adminRouter.patch("/users/:id/block", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const body = z.object({ blocked: z.boolean(), reason: z.string().optional() }).parse(req.body);
  return send(admin.setUserBlocked({
    actorUserId:  req.user!.userId,
    actorRole:    req.user!.role,
    targetUserId: req.params.id,
    blocked:      body.blocked,
    reason:       body.reason,
    ip:           ip(req),
  }), res, next);
});

/* ─── VOD CONTENT ───────────────────────────────────────── */
adminRouter.get("/vod", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const q = z.object({
    search:   z.string().optional(),
    type:     z.enum(["FREE", "PREMIUM"]).optional(),
    page:     z.coerce.number().optional(),
    pageSize: z.coerce.number().optional(),
  }).parse(req.query);
  return send(admin.listVod(q), res, next);
});

adminRouter.post("/vod", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    title:        z.string().min(1),
    description:  z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    genre:        z.string().optional(),
    type:         z.enum(["FREE", "PREMIUM"]).optional(),
    price:        z.number().int().nonnegative().optional(),
    duration:     z.number().int().nonnegative().optional(),
    youtubeId:    z.string().optional(),
  }).parse(req.body);
  return send(admin.createVod(req.user!.userId, body, ip(req)), res, next);
});

adminRouter.patch("/vod/:id", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    title:        z.string().min(1).optional(),
    description:  z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    genre:        z.string().optional(),
    type:         z.enum(["FREE", "PREMIUM"]).optional(),
    price:        z.number().int().nonnegative().optional(),
    duration:     z.number().int().nonnegative().optional(),
    isActive:     z.boolean().optional(),
    youtubeId:    z.string().optional(),
  }).parse(req.body);
  return send(admin.updateVod(req.user!.userId, req.params.id, body, ip(req)), res, next);
});

adminRouter.delete("/vod/:id", requireAuth, requireRole(...ADMIN_PLUS), async (req, res, next) => {
  try {
    await admin.deleteVod(req.user!.userId, req.params.id, ip(req));
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
});

/* ─── CHANNELS ──────────────────────────────────────────── */
adminRouter.get("/channels", requireAuth, requireRole(...CONTENT_ROLES, "OPERATOR"), (_req, res, next) =>
  send(admin.listChannels(), res, next),
);

adminRouter.post("/channels", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    name:         z.string().min(1),
    slug:         z.string().min(1),
    kind:         z.enum(["LIVE", "TV", "RADIO"]),
    streamUrl:    z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    isActive:     z.boolean().optional(),
    orderIndex:   z.number().int().optional(),
  }).parse(req.body);
  return send(admin.createChannel(req.user!.userId, body, ip(req)), res, next);
});

/* Channel update — OPERATOR ч stream URL засаж чадна (live stream restart г.м.) */
adminRouter.patch("/channels/:id", requireAuth, requireRole(...CONTENT_ROLES, "OPERATOR"), (req, res, next) => {
  const body = z.object({
    name:         z.string().min(1).optional(),
    slug:         z.string().min(1).optional(),
    kind:         z.enum(["LIVE", "TV", "RADIO"]).optional(),
    streamUrl:    z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    isActive:     z.boolean().optional(),
    orderIndex:   z.number().int().optional(),
  }).parse(req.body);
  return send(admin.updateChannel(req.user!.userId, req.params.id, body, ip(req)), res, next);
});

adminRouter.delete("/channels/:id", requireAuth, requireRole(...ADMIN_PLUS), async (req, res, next) => {
  try {
    await admin.deleteChannel(req.user!.userId, req.params.id, ip(req));
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
});

/* ─── BUNDLES ───────────────────────────────────────────── */
adminRouter.get("/bundles", requireAuth, requireRole(...CONTENT_ROLES), (_req, res, next) =>
  send(admin.listBundles(), res, next),
);

adminRouter.post("/bundles", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    title:        z.string().min(1),
    description:  z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    isActive:     z.boolean().optional(),
    orderIndex:   z.number().int().optional(),
  }).parse(req.body);
  return send(admin.createBundle(req.user!.userId, body, ip(req)), res, next);
});

adminRouter.patch("/bundles/:id", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    title:        z.string().min(1).optional(),
    description:  z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    isActive:     z.boolean().optional(),
    orderIndex:   z.number().int().optional(),
  }).parse(req.body);
  return send(admin.updateBundle(req.user!.userId, req.params.id, body, ip(req)), res, next);
});

adminRouter.delete("/bundles/:id", requireAuth, requireRole(...ADMIN_PLUS), async (req, res, next) => {
  try {
    await admin.deleteBundle(req.user!.userId, req.params.id, ip(req));
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
});

adminRouter.get("/bundles/:id/items", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) =>
  send(admin.getBundleItems(req.params.id), res, next),
);

adminRouter.post("/bundles/:id/items", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({ vodId: z.string().min(1) }).parse(req.body);
  return send(admin.addBundleItem(req.user!.userId, req.params.id, body.vodId, ip(req)), res, next);
});

adminRouter.delete("/bundles/:id/items/:vodId", requireAuth, requireRole(...CONTENT_ROLES), async (req, res, next) => {
  try {
    await admin.removeBundleItem(req.user!.userId, req.params.id, req.params.vodId, ip(req));
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
});

/* ─── PAYMENTS ──────────────────────────────────────────── */
adminRouter.get("/payments", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const q = z.object({
    status:   z.enum(["PAID", "PENDING", "FAILED", "REFUNDED"]).optional(),
    page:     z.coerce.number().optional(),
    pageSize: z.coerce.number().optional(),
  }).parse(req.query);
  return send(admin.listPayments(q), res, next);
});

adminRouter.post("/payments/:id/refund", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const body = z.object({ reason: z.string().min(1) }).parse(req.body);
  return send(admin.refundPayment(req.user!.userId, req.params.id, body.reason, ip(req)), res, next);
});

/* ─── BROADCAST NOTIFICATION ────────────────────────────── */
adminRouter.post("/notifications/broadcast", requireAuth, requireRole(...CONTENT_ROLES), (req, res, next) => {
  const body = z.object({
    title: z.string().min(1),
    body:  z.string().min(1),
    type:  z.enum(["SYSTEM", "PROMO", "CONTENT"]).optional(),
    planFilter: z.array(z.enum(["BASIC", "TV", "VOD", "COMBO"])).optional(),
  }).parse(req.body);
  return send(admin.broadcastNotification(req.user!.userId, body, ip(req)), res, next);
});

/* ─── AUDIT LOG ─────────────────────────────────────────── */
adminRouter.get("/audit", requireAuth, requireRole(...ADMIN_PLUS), (req, res, next) => {
  const q = z.object({
    page:        z.coerce.number().optional(),
    pageSize:    z.coerce.number().optional(),
    targetType:  z.string().optional(),
    actorUserId: z.string().optional(),
    from:        z.coerce.date().optional(),
    to:          z.coerce.date().optional(),
  }).parse(req.query);
  return send(admin.listAuditLogs(q), res, next);
});

/* XLSX export — Native Excel формат. Teams/Office онлайнд шууд нээгдэнэ.
   `?targetType=user&from=2026-01-01&to=2026-12-31` гэх мэтээр шүүж болно */
adminRouter.get("/audit/export.xlsx", requireAuth, requireRole(...ADMIN_PLUS), async (req, res, next) => {
  try {
    const q = z.object({
      targetType: z.string().optional(),
      from:       z.coerce.date().optional(),
      to:         z.coerce.date().optional(),
    }).parse(req.query);

    const buf = await admin.exportAuditXlsx(q);
    const filename = `audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (e) { next(e); }
});
