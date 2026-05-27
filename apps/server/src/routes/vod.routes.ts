import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { cacheControl } from "../middleware/cache.middleware";
import * as ctrl from "../controllers/vod.controller";

export const vodRouter = Router();

/* VOD listing endpoint-ууд — content бараг өөрчлөгддөггүй, бүх хэрэглэгчид нэг
   response. 5 минутын public cache (CDN + browser хоёуланд) — server hit бараг
   арилна. Шинэ content нэмэгдвэл хуудас reload-д 5 мин хүртэл хүлээгдэнэ. */
vodRouter.get("/archive",     cacheControl(300, "public"), ctrl.listArchive);
vodRouter.get("/library",     cacheControl(300, "public"), ctrl.listLibrary);
vodRouter.get("/bundles",     cacheControl(300, "public"), ctrl.listBundles);
vodRouter.get("/bundles/:id", cacheControl(300, "public"), ctrl.getBundle);

// Shows
vodRouter.get("/shows",       cacheControl(300, "public"), ctrl.listShows);
vodRouter.get("/shows/:slug", cacheControl(300, "public"), ctrl.getShow);

// YouTube list
vodRouter.get("/youtube",     cacheControl(300, "public"), ctrl.listYoutube);

// Stream + progress (auth) — cache хийхгүй (per-user, write)
vodRouter.get("/:id/stream", requireAuth, ctrl.getStream);
vodRouter.post("/:id/progress", requireAuth, ctrl.saveProgress);

/* Detail (public) — public cache. Хэрэглэгчид ялгаагүй (access decision frontend
   талд subscription endpoint-аар separately шалгана). */
vodRouter.get("/:id", cacheControl(300, "public"), ctrl.getVod);
