import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";
import { invalidateChannelsCache } from "../../routes/channel.routes";
import type { ChannelKind } from "@prisma/client";

export async function listChannels() {
  return prisma.channel.findMany({
    orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
  });
}

export async function createChannel(actorUserId: string, data: {
  name:          string;
  slug:          string;
  kind:          ChannelKind;
  streamUrl?:    string;
  thumbnailUrl?: string;
  isActive?:     boolean;
  orderIndex?:   number;
  price?:        number | null;
  startsAt?:     string | Date | null;
  endsAt?:       string | Date | null;
}, ip?: string) {
  /* Шинэ загвар (v2): LIVE event-үүд олон удаа үүсгэх боломжтой — нэг event нэг
   * channel. Тиймээс хуучин LIVE_EXISTS check-ийг устгасан. */
  const ch = await prisma.channel.create({
    data: {
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt:   data.endsAt   ? new Date(data.endsAt)   : null,
    },
  });
  await audit({ actorUserId, targetType: "channel", targetId: ch.id, action: "CREATE", after: data, ip });
  await invalidateChannelsCache();
  return ch;
}

export async function updateChannel(actorUserId: string, id: string, data: Partial<{
  name:         string;
  slug:         string;
  kind:         ChannelKind;
  streamUrl:    string;
  thumbnailUrl: string;
  isActive:     boolean;
  orderIndex:   number;
  price:        number | null;
  startsAt:     string | Date | null;
  endsAt:       string | Date | null;
}>, ip?: string) {
  const before = await prisma.channel.findUnique({ where: { id } });
  if (!before) throw new AppError("Channel олдсонгүй", 404, "NOT_FOUND");
  const after = await prisma.channel.update({
    where: { id },
    data: {
      ...data,
      ...(data.startsAt !== undefined && { startsAt: data.startsAt ? new Date(data.startsAt) : null }),
      ...(data.endsAt   !== undefined && { endsAt:   data.endsAt   ? new Date(data.endsAt)   : null }),
    },
  });
  await audit({ actorUserId, targetType: "channel", targetId: id, action: "UPDATE", before, after, ip });
  await invalidateChannelsCache();
  return after;
}

export async function deleteChannel(actorUserId: string, id: string, ip?: string) {
  const before = await prisma.channel.findUnique({ where: { id } });
  if (!before) throw new AppError("Channel олдсонгүй", 404, "NOT_FOUND");
  await prisma.channel.delete({ where: { id } });
  await audit({ actorUserId, targetType: "channel", targetId: id, action: "DELETE", before, ip });
  await invalidateChannelsCache();
}
