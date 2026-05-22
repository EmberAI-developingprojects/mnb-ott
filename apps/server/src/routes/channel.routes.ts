import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { getEpg, getChannelEpg } from "../services/epg.service";
import { checkContentAccess } from "../services/subscription.service";
import { requireAuth } from "../middleware/auth.middleware";
import type { AuthPayload } from "../middleware/auth.middleware";

export const channelRouter = Router();

/* Public: бүх идэвхтэй суваг буцаана (browse үед нэвтрэхгүй ч харагдана).
   streamUrl нь зөвхөн live-tv access-тэй нэвтэрсэн хэрэглэгчид буцаах.
   Зочин/access-гүй: streamUrl=null → frontend дээр UpgradePrompt харуулна. */
channelRouter.get("/", async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      where:   { isActive: true },
      orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
    });

    /* Optional auth — Authorization header байгаа бол verify хийж access шалгах */
    let hasLiveAccess = false;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        const decision = await checkContentAccess(payload.userId, "live-tv");
        hasLiveAccess = decision.allowed;
      } catch { /* token хүчингүй — хэвээр зочин */ }
    }

    res.json({
      success: true,
      data: {
        channels: channels.map((c) => ({
          id:           c.id,
          name:         c.name,
          slug:         c.slug,
          kind:         c.kind,
          thumbnailUrl: c.thumbnailUrl,
          orderIndex:   c.orderIndex,
          isActive:     c.isActive,
          /* streamUrl зөвхөн access-тэй хэрэглэгчид */
          streamUrl:    hasLiveAccess ? c.streamUrl : null,
        })),
      },
    });
  } catch (e) { next(e); }
});

/* EPG — public (хөтөлбөрийн жагсаалт хэн ч үзэж болно) */
channelRouter.get("/epg", (_req, res) => {
  const channels = getEpg(3, 5);
  res.json({ success: true, data: { channels } });
});

channelRouter.get("/:slug/epg", (req, res) => {
  const ch = getChannelEpg(req.params.slug);
  if (!ch) return res.status(404).json({ success: false, message: "Суваг олдсонгүй", code: "NOT_FOUND" });
  res.json({ success: true, data: ch });
});

/* Зөвхөн нэвтэрсэн хэрэглэгч stream URL авах. Plan шалгалт давхар.
   GET /api/channels/:slug — slug-аар хайж нэг суваг буцаана + access шалгах */
channelRouter.get("/:slug", requireAuth, async (req, res, next) => {
  try {
    const ch = await prisma.channel.findUnique({ where: { slug: req.params.slug } });
    if (!ch) return res.status(404).json({ success: false, message: "Суваг олдсонгүй", code: "NOT_FOUND" });

    const decision = await checkContentAccess(req.user!.userId, "live-tv");
    res.json({
      success: true,
      data: {
        id:           ch.id,
        name:         ch.name,
        slug:         ch.slug,
        kind:         ch.kind,
        thumbnailUrl: ch.thumbnailUrl,
        streamUrl:    decision.allowed ? ch.streamUrl : null,
        access:       decision,
      },
    });
  } catch (e) { next(e); }
});

/* DVR catch-up playlist — энэ feature нь ffmpeg encoder + S3 segment storage
   шаардана. Production-д тусдаа sprint-д хийгдэх ёстой. Одоо 501 буцаана. */
channelRouter.get("/:slug/dvr", requireAuth, (_req, res) => {
  res.status(501).json({
    success: false,
    code:    "NOT_IMPLEMENTED",
    message: "DVR catch-up функц хараахан бэлэн биш байна",
  });
});
