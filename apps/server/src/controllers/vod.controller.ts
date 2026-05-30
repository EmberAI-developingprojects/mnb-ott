import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as ytService from "../services/youtube.service";
import * as library from "../services/library.service";
import { checkContentAccess } from "../services/subscription.service";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";

// GET /api/vod/archive   — Архив (limit заавал, нүүрэнд 5, иначе бүгд)
export async function listArchive(req: Request, res: Response, next: NextFunction) {
  try {
    const all = req.query.all === "1";
    if (all) {
      const videos = await library.getArchiveAll();
      return res.json({ success: true, data: { videos } });
    }
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const videos = await library.getArchiveLatest(limit);
    res.json({ success: true, data: { videos } });
  } catch (e) { next(e); }
}

// GET /api/vod/library   — Видео сан
export async function listLibrary(req: Request, res: Response, next: NextFunction) {
  try {
    const all = req.query.all === "1";
    if (all) {
      const videos = await library.getLibraryAll();
      return res.json({ success: true, data: { videos } });
    }
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const videos = await library.getLibraryLatest(limit);
    res.json({ success: true, data: { videos } });
  } catch (e) { next(e); }
}

// GET /api/vod/bundles   — багцууд (тус бүр дотроо видеотой)
export async function listBundles(_req: Request, res: Response, next: NextFunction) {
  try {
    const bundles = await library.getBundles();
    res.json({ success: true, data: { bundles } });
  } catch (e) { next(e); }
}

// GET /api/vod/bundles/:id
export async function getBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const b = await library.getBundleById(req.params.id);
    if (!b) throw new AppError("Багц олдсонгүй", 404, "NOT_FOUND");
    res.json({ success: true, data: b });
  } catch (e) { next(e); }
}

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
// Хариунд `accessKind` нэмж буцаана — frontend үүгээр plan-ийн хязгаарлалт шалгана:
//   archive : нэвтэрсэн бүхэнд үнэгүй
//   library : VOD / COMBO багц шаарддаг
//   bundle  : VOD / COMBO эсвэл тус видеог түрээслэх (TVOD)
export async function getVod(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      const video = await ytService.getYoutubeVideo(id);
      if (!video) throw new AppError("Видео олдсонгүй", 404, "NOT_FOUND");

      const cls = await library.classifyContent(id);
      return res.json({
        success: true,
        data: {
          type: "youtube",
          accessKind: cls.kind,
          price:      cls.price,
          bundleId:   cls.bundleId,
          ...video,
        },
      });
    }

    const vod = await prisma.vodContent.findUnique({
      where: { id },
      include: { sources: true },
    });
    if (!vod) throw new AppError("Видео олдсонгүй", 404, "NOT_FOUND");
    res.json({ success: true, data: { ...vod, type: "premium", accessKind: "library" } });
  } catch (e) { next(e); }
}

// GET /api/vod/:id/stream  (auth шаарддаг)
export async function getStream(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // YouTube видео — access kind-ээс хамаарч эрх шалгана
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      const cls = await library.classifyContent(id);

      /* archive = нэвтэрсэн бүхэнд үнэгүй. library/bundle = эрх шалгана.
         Өмнө шалгалтгүй шууд embed буцаадаг байсан тул PPV/premium YouTube
         контентыг дурын нэвтэрсэн хэрэглэгч үнэгүй үздэг security нүх байсан. */
      if (cls.kind === "library" || cls.kind === "bundle") {
        const decision = await checkContentAccess(req.user!.userId, cls.kind, id);
        if (!decision.allowed) {
          throw new AppError("Эрх хүрэлцэхгүй", 403,
            cls.kind === "bundle" ? "PURCHASE_REQUIRED" : "SUBSCRIPTION_REQUIRED");
        }
      }

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
      const decision = await checkContentAccess(req.user.userId, "library", id);
      if (!decision.allowed) {
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
