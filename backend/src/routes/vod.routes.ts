import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as ctrl from "../controllers/vod.controller";

export const vodRouter = Router();

// Shows
vodRouter.get("/shows", ctrl.listShows);
vodRouter.get("/shows/:slug", ctrl.getShow);

// YouTube list
vodRouter.get("/youtube", ctrl.listYoutube);

// Stream + progress (auth)
vodRouter.get("/:id/stream", requireAuth, ctrl.getStream);
vodRouter.post("/:id/progress", requireAuth, ctrl.saveProgress);

// Detail (public)
vodRouter.get("/:id", ctrl.getVod);
