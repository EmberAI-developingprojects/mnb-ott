import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";

export async function listVod(opts: {
  search?:   string;
  type?:     "FREE" | "PREMIUM";
  page?:     number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const take = Math.min(100, opts.pageSize ?? 30);
  const skip = (page - 1) * take;

  const where = {
    ...(opts.search ? { title: { contains: opts.search, mode: "insensitive" as const } } : {}),
    ...(opts.type   ? { type: opts.type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.vodContent.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: { sources: true, _count: { select: { purchases: true } } },
    }),
    prisma.vodContent.count({ where }),
  ]);

  return { items, total, page, pageSize: take };
}

export async function createVod(actorUserId: string, data: {
  title:        string;
  description?: string;
  thumbnailUrl?: string;
  genre?:       string;
  type?:        "FREE" | "PREMIUM";
  price?:       number;
  duration?:    number;
  youtubeId?:   string;
}, ip?: string) {
  const vod = await prisma.vodContent.create({
    data: {
      title:        data.title,
      description:  data.description,
      thumbnailUrl: data.thumbnailUrl,
      genre:        data.genre,
      type:         data.type ?? "FREE",
      price:        data.price,
      duration:     data.duration,
      publishedAt:  new Date(),
      sources: data.youtubeId
        ? { create: { sourceType: "YOUTUBE", url: `https://youtu.be/${data.youtubeId}`, youtubeId: data.youtubeId } }
        : undefined,
    },
  });
  await audit({ actorUserId, targetType: "vod", targetId: vod.id, action: "CREATE", after: data, ip });
  return vod;
}

export async function updateVod(actorUserId: string, id: string, data: Partial<{
  title:        string;
  description:  string;
  thumbnailUrl: string;
  genre:        string;
  type:         "FREE" | "PREMIUM";
  price:        number;
  duration:     number;
  isActive:     boolean;
  youtubeId:    string;
}>, ip?: string) {
  const before = await prisma.vodContent.findUnique({ where: { id }, include: { sources: true } });
  if (!before) throw new AppError("VOD олдсонгүй", 404, "NOT_FOUND");

  const { youtubeId, ...vodData } = data;
  const after = await prisma.vodContent.update({ where: { id }, data: vodData });

  /* YouTube source upsert/delete (хэрэв youtubeId шинэчлэгдсэн бол) */
  if (youtubeId !== undefined) {
    const existing = before.sources.find((s) => s.sourceType === "YOUTUBE");
    if (youtubeId) {
      if (existing) {
        await prisma.vodSource.update({
          where: { id: existing.id },
          data:  { url: `https://youtu.be/${youtubeId}`, youtubeId },
        });
      } else {
        await prisma.vodSource.create({
          data: { vodId: id, sourceType: "YOUTUBE", url: `https://youtu.be/${youtubeId}`, youtubeId },
        });
      }
    } else if (existing) {
      await prisma.vodSource.delete({ where: { id: existing.id } });
    }
  }

  await audit({
    actorUserId, targetType: "vod", targetId: id, action: "UPDATE",
    before, after: { ...after, youtubeId }, ip,
  });
  return after;
}

export async function deleteVod(actorUserId: string, id: string, ip?: string) {
  const before = await prisma.vodContent.findUnique({ where: { id } });
  if (!before) throw new AppError("VOD олдсонгүй", 404, "NOT_FOUND");
  await prisma.vodContent.delete({ where: { id } });
  await audit({ actorUserId, targetType: "vod", targetId: id, action: "DELETE", before, ip });
}
