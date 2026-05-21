import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getEpg, getChannelEpg } from "../services/epg.service";

export const channelRouter = Router();

// Бүх суваг (mock — DB суваг нэмэгдэхэд солих)
channelRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      channels: [
        { id: "ch1", name: "МНБ 1", slug: "mnb1", orderIndex: 1, isActive: true },
        { id: "ch2", name: "МНБ 2", slug: "mnb2", orderIndex: 2, isActive: true },
        { id: "ch3", name: "МНБ World", slug: "mnb-world", orderIndex: 3, isActive: true },
        { id: "ch4", name: "МНБ 4", slug: "mnb4", orderIndex: 4, isActive: true },
        { id: "ch5", name: "МНБ 5", slug: "mnb5", orderIndex: 5, isActive: true },
      ],
    },
  });
});

// Бүх сувгийн EPG (3 хойшоо + 5 урагшаа)
channelRouter.get("/epg", (_req, res) => {
  const channels = getEpg(3, 5);
  res.json({ success: true, data: { channels } });
});

// Нэг сувгийн EPG
channelRouter.get("/:slug/epg", (req, res) => {
  const ch = getChannelEpg(req.params.slug);
  if (!ch) return res.status(404).json({ success: false, message: "Суваг олдсонгүй", code: "NOT_FOUND" });
  res.json({ success: true, data: ch });
});

channelRouter.get("/:id", requireAuth, (_req, res) => {
  res.json({ success: true, data: { message: "TODO: stream URL" } });
});

channelRouter.get("/:id/dvr", requireAuth, (_req, res) => {
  res.json({ success: true, data: { message: "TODO: DVR playlist" } });
});
