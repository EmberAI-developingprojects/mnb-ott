import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as ytService from "../services/youtube.service";
import type { YtShow } from "../services/youtube.service";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";

// GET /api/vod/shows
export async function listShows(req: Request, res: Response, next: NextFunction) {
  try {
    const shows = await ytService.getYoutubeShows();
    res.json({ success: true, data: { shows } });
  } catch (e) { next(e); }
}

// GET /api/vod/shows/:slug
export async function getShow(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const [shows, episodes] = await Promise.all([
      ytService.getYoutubeShows(),
      ytService.getYoutubeShowVideos(slug),
    ]);
    const show = shows.find((s) => s.slug === slug);
    if (!show) throw new AppError("Нэвтрүүлэг олдсонгүй", 404, "NOT_FOUND");
    res.json({ success: true, data: { show, episodes } });
  } catch (e) { next(e); }
}

// GET /api/vod/youtube?page=1&limit=20&pageToken=xxx
export async function listYoutube(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, pageToken } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().min(1).max(50).default(20),
      pageToken: z.string().optional(),
    }).parse(req.query);

    const result = await ytService.getYoutubeVideos(page, limit, pageToken);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

// GET /api/vod/:id  (youtubeId эсвэл DB id)
export async function getVod(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // YouTube ID шиг харагдаж байвал (11 тэмдэгт) YouTube-с авна
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      const video = await ytService.getYoutubeVideo(id);
      if (!video) throw new AppError("Видео олдсонгүй", 404, "NOT_FOUND");
      return res.json({ success: true, data: { type: "youtube", ...video } });
    }

    // DB-с авна (Premium VOD)
    const vod = await prisma.vodContent.findUnique({
      where: { id },
      include: { sources: true },
    });
    if (!vod) throw new AppError("Видео олдсонгүй", 404, "NOT_FOUND");
    res.json({ success: true, data: { ...vod, type: "premium" } });
  } catch (e) { next(e); }
}

// GET /api/vod/:id/stream  (auth шаарддаг)
export async function getStream(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // YouTube видео бол iframe embed URL буцаана
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return res.json({
        success: true,
        data: {
          type: "youtube",
          embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
        },
      });
    }

    // Premium VOD — эрх шалгаж S3 URL буцаана
    const vod = await prisma.vodContent.findUnique({
      where: { id },
      include: { sources: true },
    });
    if (!vod) throw new AppError("Видео олдсонгүй", 404, "NOT_FOUND");

    if (vod.type === "PREMIUM" && req.user) {
      const hasPurchase = await prisma.purchase.findFirst({
        where: {
          userId: req.user.userId,
          vodId: id,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      });
      const hasSub = await prisma.subscription.findFirst({
        where: { userId: req.user.userId, planType: { in: ["STANDARD", "PREMIUM"] }, status: "ACTIVE" },
      });
      if (!hasPurchase && !hasSub) {
        throw new AppError("Эрх хүрэлцэхгүй", 403, "SUBSCRIPTION_REQUIRED");
      }
    }

    const source = vod.sources[0];
    if (!source) throw new AppError("Stream URL олдсонгүй", 404, "NO_SOURCE");

    res.json({ success: true, data: { url: source.url, type: source.sourceType } });
  } catch (e) { next(e); }
}

// POST /api/vod/:id/progress  (auth шаарддаг)
export async function saveProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { positionSec } = z.object({ positionSec: z.number().int().min(0) }).parse(req.body);

    await prisma.watchHistory.upsert({
      where: { userId_contentId_contentType: { userId: req.user!.userId, contentId: id, contentType: "VOD" } },
      create: { userId: req.user!.userId, contentId: id, contentType: "VOD", positionSec },
      update: { positionSec },
    });

    res.json({ success: true, data: { saved: true } });
  } catch (e) { next(e); }
}
