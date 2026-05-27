import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { getEpg, getChannelEpg } from "../services/epg.service";
import { checkContentAccess } from "../services/subscription.service";
import { requireAuth } from "../middleware/auth.middleware";
import type { AuthPayload } from "../middleware/auth.middleware";

export const channelRouter = Router();

/* Public: бүх идэвхтэй суваг буцаана (browse үед нэвтрэхгүй ч харагдана).
   TV/RADIO: нэвтэрсэн л бол streamUrl буцаана (үнэгүй).
   LIVE event: PPV — streamUrl зөвхөн худалдан авсан хэрэглэгчид. Энэ check-ийг
   олон concurrent DB call-аар хийхгүйгээр нэг batch query-аар хийнэ. */
channelRouter.get("/", async (req, res, next) => {
  try {
    const channels = await prisma.channel.findMany({
      where:   { isActive: true },
      orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
    });

    /* Optional auth — token байгаа бол userId */
    let userId: string | null = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        userId = payload.userId;
      } catch { /* token хүчингүй */ }
    }

    /* LIVE channel-уудын Purchase-ийг нэг query-аар татна (batch). */
    let livePurchaseIds = new Set<string>();
    if (userId) {
      const liveChannelIds = channels.filter((c) => c.kind === "LIVE").map((c) => c.id);
      if (liveChannelIds.length > 0) {
        const purchases = await prisma.purchase.findMany({
          where: {
            userId,
            channelId: { in: liveChannelIds },
            status:    "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { channelId: true },
        });
        livePurchaseIds = new Set(purchases.map((p) => p.channelId!).filter(Boolean));
      }
    }

    /* Frontend бүх хуудсуудад тус тусдаа category хэрэглэгддэг тул response-ийг
       3 групп болгож буцаана (frontend-д filter хийх хэрэггүй). Хуучин `channels`
       key нь backward compat-ийн тулд бүх сувгийг flat үлдээнэ. */
    const mapped = channels.map((c) => {
      const allowed =
        (c.kind === "TV" || c.kind === "RADIO") ? !!userId :
        c.kind === "LIVE" ? livePurchaseIds.has(c.id) : false;
      return {
        id:           c.id,
        name:         c.name,
        slug:         c.slug,
        kind:         c.kind,
        thumbnailUrl: c.thumbnailUrl,
        orderIndex:   c.orderIndex,
        isActive:     c.isActive,
        price:        c.price,
        startsAt:     c.startsAt,
        endsAt:       c.endsAt,
        streamUrl:    allowed ? c.streamUrl : null,
      };
    });

    res.json({
      success: true,
      data: {
        tv:       mapped.filter((c) => c.kind === "TV"),
        radio:    mapped.filter((c) => c.kind === "RADIO"),
        live:     mapped.filter((c) => c.kind === "LIVE"),
        channels: mapped,  /* legacy — устгахдаа /api/channels хэрэглэгчдийг шалга */
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
