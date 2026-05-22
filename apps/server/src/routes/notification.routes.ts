import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";

export const notificationRouter = Router();

/* GET /api/notifications  — миний мэдэгдлийн жагсаалт */
notificationRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { limit, cursor } = z.object({
      limit:  z.coerce.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }).parse(req.query);

    const items = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    res.json({ success: true, data: { items, nextCursor } });
  } catch (e) { next(e); }
});

/* GET /api/notifications/unread-count */
notificationRouter.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const unread = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ success: true, data: { unread } });
  } catch (e) { next(e); }
});

/* PATCH /api/notifications/:id/read */
notificationRouter.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!n || n.userId !== req.user!.userId) {
      throw new AppError("Мэдэгдэл олдсонгүй", 404, "NOT_FOUND");
    }
    await prisma.notification.update({ where: { id: n.id }, data: { isRead: true } });
    res.json({ success: true, data: { ok: true } });
  } catch (e) { next(e); }
});

/* POST /api/notifications/mark-all-read */
notificationRouter.post("/mark-all-read", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data:  { isRead: true },
    });
    res.json({ success: true, data: { ok: true } });
  } catch (e) { next(e); }
});

/* DELETE /api/notifications/:id */
notificationRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!n || n.userId !== req.user!.userId) {
      throw new AppError("Мэдэгдэл олдсонгүй", 404, "NOT_FOUND");
    }
    await prisma.notification.delete({ where: { id: n.id } });
    res.json({ success: true, data: { ok: true } });
  } catch (e) { next(e); }
});
