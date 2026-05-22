import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";

export async function listBundles() {
  return prisma.vodBundle.findMany({
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function createBundle(actorUserId: string, data: {
  title:        string;
  description?: string;
  thumbnailUrl?: string;
  isActive?:    boolean;
  orderIndex?:  number;
}, ip?: string) {
  const b = await prisma.vodBundle.create({ data });
  await audit({ actorUserId, targetType: "bundle", targetId: b.id, action: "CREATE", after: data, ip });
  return b;
}

export async function updateBundle(actorUserId: string, id: string, data: Partial<{
  title:        string;
  description:  string;
  thumbnailUrl: string;
  isActive:     boolean;
  orderIndex:   number;
}>, ip?: string) {
  const before = await prisma.vodBundle.findUnique({ where: { id } });
  if (!before) throw new AppError("Bundle олдсонгүй", 404, "NOT_FOUND");
  const after = await prisma.vodBundle.update({ where: { id }, data });
  await audit({ actorUserId, targetType: "bundle", targetId: id, action: "UPDATE", before, after, ip });
  return after;
}

export async function deleteBundle(actorUserId: string, id: string, ip?: string) {
  const before = await prisma.vodBundle.findUnique({ where: { id } });
  if (!before) throw new AppError("Bundle олдсонгүй", 404, "NOT_FOUND");
  await prisma.vodBundle.delete({ where: { id } });
  await audit({ actorUserId, targetType: "bundle", targetId: id, action: "DELETE", before, ip });
}

export async function getBundleItems(bundleId: string) {
  return prisma.vodBundleItem.findMany({
    where:   { bundleId },
    orderBy: { orderIndex: "asc" },
    include: { vod: { select: { id: true, title: true, thumbnailUrl: true, duration: true } } },
  });
}

export async function addBundleItem(actorUserId: string, bundleId: string, vodId: string, ip?: string) {
  const item = await prisma.vodBundleItem.upsert({
    where:  { bundleId_vodId: { bundleId, vodId } },
    create: { bundleId, vodId },
    update: {},
  });
  await audit({ actorUserId, targetType: "bundle", targetId: bundleId, action: "ADD_ITEM", after: { vodId }, ip });
  return item;
}

export async function removeBundleItem(actorUserId: string, bundleId: string, vodId: string, ip?: string) {
  await prisma.vodBundleItem.delete({ where: { bundleId_vodId: { bundleId, vodId } } });
  await audit({ actorUserId, targetType: "bundle", targetId: bundleId, action: "REMOVE_ITEM", before: { vodId }, ip });
}
