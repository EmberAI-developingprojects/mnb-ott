import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";
import type { ChannelKind } from "@prisma/client";

export async function listChannels() {
  return prisma.channel.findMany({
    orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
  });
}

export async function createChannel(actorUserId: string, data: {
  name:         string;
  slug:         string;
  kind:         ChannelKind;
  streamUrl?:   string;
  thumbnailUrl?: string;
  isActive?:    boolean;
  orderIndex?:  number;
}, ip?: string) {
  /* LIVE төрөл нь нэг л байх ёстой — давтан үүсгэх оролдлогыг таслан зогсооно */
  if (data.kind === "LIVE") {
    const existing = await prisma.channel.findFirst({ where: { kind: "LIVE" } });
    if (existing) throw new AppError("LIVE суваг аль хэдийн бий — оронд нь засна уу", 400, "LIVE_EXISTS");
  }
  const ch = await prisma.channel.create({ data });
  await audit({ actorUserId, targetType: "channel", targetId: ch.id, action: "CREATE", after: data, ip });
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
}>, ip?: string) {
  const before = await prisma.channel.findUnique({ where: { id } });
  if (!before) throw new AppError("Channel олдсонгүй", 404, "NOT_FOUND");
  const after = await prisma.channel.update({ where: { id }, data });
  await audit({ actorUserId, targetType: "channel", targetId: id, action: "UPDATE", before, after, ip });
  return after;
}

export async function deleteChannel(actorUserId: string, id: string, ip?: string) {
  const before = await prisma.channel.findUnique({ where: { id } });
  if (!before) throw new AppError("Channel олдсонгүй", 404, "NOT_FOUND");
  await prisma.channel.delete({ where: { id } });
  await audit({ actorUserId, targetType: "channel", targetId: id, action: "DELETE", before, ip });
}
