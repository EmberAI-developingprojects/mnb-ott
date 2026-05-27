import { Router } from "express";
import { z } from "zod";
import { searchYoutubeVideos } from "../services/youtube.service";
import { searchLimiter } from "../middleware/rate-limit.middleware";

export const searchRouter = Router();

searchRouter.get("/", searchLimiter, async (req, res, next) => {
  try {
    const { q } = z.object({ q: z.string().min(1).max(100) }).parse(req.query);
    const videos = await searchYoutubeVideos(q, 20);
    res.json({ success: true, data: { videos } });
  } catch (e) { next(e); }
});
