import { Router } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getEpg, getChannelEpg } from "../services/epg.service";
import { checkContentAccess } from "../services/subscription.service";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware";

export const channelRouter = Router();

/* Идэвхтэй сувгийн base list — admin өөрчлөхөд л шинэчлэгдэнэ. Хамгийн их
   ачаалалтай endpoint (нүүр+tv+live). Per-user LIVE purchase нь тусдаа.
   admin channels.service-ийн create/update/delete-д invalidate хийгдэнэ. */
const CHANNELS_CACHE_KEY = "channels:active";
const CHANNELS_CACHE_TTL = 60;

type ChannelRow = {
  id: string; name: string; slug: string; kind: string;
  thumbnailUrl: string | null; streamUrl: string | null; orderIndex: number;
  isActive: boolean; price: number | null; startsAt: string | null; endsAt: string | null;
};

async function getActiveChannels(): Promise<ChannelRow[]> {
  const cached = await redis.get(CHANNELS_CACHE_KEY);
  if (cached) return JSON.parse(cached) as ChannelRow[];

  const channels = await prisma.channel.findMany({
    where:   { isActive: true },
    orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
    select: {
      id: true, name: true, slug: true, kind: true,
      thumbnailUrl: true, streamUrl: true, orderIndex: true,
      isActive: true, price: true, startsAt: true, endsAt: true,
    },
  });
  await redis.set(CHANNELS_CACHE_KEY, JSON.stringify(channels), "EX", CHANNELS_CACHE_TTL);
  return channels as unknown as ChannelRow[];
}

/* Admin channel CRUD-ийн дараа дуудна — cache шууд цэвэрлэнэ. */
export async function invalidateChannelsCache(): Promise<void> {
  await redis.del(CHANNELS_CACHE_KEY);
}

/* Public: бүх идэвхтэй суваг буцаана (browse үед нэвтрэхгүй ч харагдана).
   TV/RADIO: нэвтэрсэн л бол streamUrl буцаана (үнэгүй).
   LIVE event: PPV — streamUrl зөвхөн худалдан авсан хэрэглэгчид. Энэ check-ийг
   олон concurrent DB call-аар хийхгүйгээр нэг batch query-аар хийнэ.
   Cache: streamUrl нь user-аас хамаардаг (LIVE PPV) тул private, 60с. */
channelRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    /* Redis-cached base channel list (admin өөрчлөхөд invalidate) */
    const channels = await getActiveChannels();

    /* optionalAuth middleware req.user-ийг тавьсан байна (token байвал) */
    const userId: string | null = req.user?.userId ?? null;

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

    /* User-specific (streamUrl нь Purchase-ээс хамаарна) тул `private`.
       60с TTL — channel мэдээлэл хурдан өөрчлөгддөггүй. */
    res.setHeader("Cache-Control", "private, max-age=60");
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

/* EPG — public (хөтөлбөрийн жагсаалт хэн ч үзэж болно).
   Cache: бүх хэрэглэгчид нэг л response, 5 мин TTL — CDN/browser хоёуланд cache.
   getEpg/getChannelEpg нь provider-аас хамаарч sync (mock) эсвэл async (xml fetch)
   тул `await` хэрэглэж хоёуланд тохирно. */
channelRouter.get("/epg", async (_req, res, next) => {
  try {
    const channels = await getEpg(3, 5);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ success: true, data: { channels } });
  } catch (e) { next(e); }
});

channelRouter.get("/:slug/epg", async (req, res, next) => {
  try {
    const ch = await getChannelEpg(req.params.slug);
    if (!ch) return res.status(404).json({ success: false, message: "Суваг олдсонгүй", code: "NOT_FOUND" });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ success: true, data: ch });
  } catch (e) { next(e); }
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
