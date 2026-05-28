import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";
import type { Role } from "@prisma/client";

/* Ролийн зэрэглэлийн дараалал — privilege escalation хамгаалахад ашиглана.
   EDITOR + OPERATOR ижил түвшний content/operator role. */
const ROLE_RANK: Record<Role, number> = {
  USER:        0,
  EDITOR:      1,
  OPERATOR:    1,
  ADMIN:       2,
  SUPER_ADMIN: 3,
};

export async function listUsers(opts: {
  search?:   string;
  role?:     Role;
  page?:     number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const take = Math.min(100, opts.pageSize ?? 30);
  const skip = (page - 1) * take;

  const where = {
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.search
      ? {
          OR: [
            { name:  { contains: opts.search, mode: "insensitive" as const } },
            { email: { contains: opts.search, mode: "insensitive" as const } },
            { phone: { contains: opts.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: { subscription: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(({ password: _, ...u }) => u),
    total,
    page,
    pageSize: take,
  };
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      sessions:     { where: { isActive: true }, orderBy: { lastActive: "desc" } },
      purchases:    {
        orderBy: { createdAt: "desc" },
        take:    20,
        include: { vod: { select: { title: true } } },
      },
      payments:     { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");
  const { password: _, ...safe } = user;
  return safe;
}

/* Role change дүрэм:
   - ADMIN: USER ↔ EDITOR/OPERATOR хооронд өөрчилнө
   - SUPER_ADMIN: бүгдийг (өөр SUPER_ADMIN-ийг ч) өөрчилнө
   - Сүүлчийн SUPER_ADMIN-ийг demote хийхгүй
   - Өөрийгөө demote хийх боломжгүй */
export async function changeUserRole(opts: {
  actorUserId:  string;
  actorRole:    Role;
  targetUserId: string;
  newRole:      Role;
  ip?:          string;
}) {
  if (opts.actorUserId === opts.targetUserId) {
    throw new AppError("Өөрийнхөө role-ийг өөрчилж болохгүй", 400, "SELF_ROLE_CHANGE");
  }

  const target = await prisma.user.findUnique({ where: { id: opts.targetUserId } });
  if (!target) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  const actorRank  = ROLE_RANK[opts.actorRole];
  const targetRank = ROLE_RANK[target.role];
  const newRank    = ROLE_RANK[opts.newRole];

  /* SUPER_ADMIN нь онцгой эрхтэй — өөр SUPER_ADMIN-руу үйлдэл хийж чадна. */
  const actorIsSuperAdmin = opts.actorRole === "SUPER_ADMIN";
  if (targetRank > actorRank || (targetRank === actorRank && !actorIsSuperAdmin)) {
    throw new AppError("Танаас өндөр зэрэглэлтэй хэрэглэгчийг өөрчилж чадахгүй", 403, "INSUFFICIENT_RANK");
  }
  if (newRank > actorRank || (newRank === actorRank && !actorIsSuperAdmin)) {
    throw new AppError("Танаас өндөр эсвэл адил зэрэглэлд promote хийж болохгүй", 403, "INSUFFICIENT_RANK");
  }

  /* Сүүлчийн SUPER_ADMIN-ийг demote хийхгүй */
  if (target.role === "SUPER_ADMIN" && opts.newRole !== "SUPER_ADMIN") {
    const superCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superCount <= 1) {
      throw new AppError("Сүүлчийн SUPER_ADMIN-ийг demote хийж болохгүй", 400, "LAST_SUPER_ADMIN");
    }
  }

  const updated = await prisma.user.update({
    where: { id: opts.targetUserId },
    data:  { role: opts.newRole },
  });

  await audit({
    actorUserId: opts.actorUserId,
    targetType:  "user",
    targetId:    opts.targetUserId,
    action:      "ROLE_CHANGE",
    before:      { role: target.role },
    after:       { role: opts.newRole },
    ip:          opts.ip,
  });

  return updated;
}

export async function setUserBlocked(opts: {
  actorUserId:  string;
  actorRole:    Role;
  targetUserId: string;
  blocked:      boolean;
  reason?:      string;
  ip?:          string;
}) {
  if (opts.actorUserId === opts.targetUserId) {
    throw new AppError("Өөрийгөө ban хийж болохгүй", 400, "SELF_BAN");
  }
  const target = await prisma.user.findUnique({ where: { id: opts.targetUserId } });
  if (!target) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  if (ROLE_RANK[target.role] >= ROLE_RANK[opts.actorRole]) {
    throw new AppError("Танаас өндөр зэрэглэлтэй хэрэглэгчийг ban хийж чадахгүй", 403, "INSUFFICIENT_RANK");
  }

  const updated = await prisma.user.update({
    where: { id: opts.targetUserId },
    data:  { isBlocked: opts.blocked },
  });

  /* Ban болсон үед бүх session-ийг хаах */
  if (opts.blocked) {
    await prisma.userSession.updateMany({
      where: { userId: opts.targetUserId, isActive: true },
      data:  { isActive: false },
    });
  }

  await audit({
    actorUserId: opts.actorUserId,
    targetType:  "user",
    targetId:    opts.targetUserId,
    action:      opts.blocked ? "BAN" : "UNBAN",
    before:      { isBlocked: target.isBlocked },
    after:       { isBlocked: opts.blocked },
    reason:      opts.reason,
    ip:          opts.ip,
  });

  return updated;
}

/* Хэрэглэгчийг бүрмөсөн устгах (hard delete, cascade).
   Аюулгүй байдлын дүрэм:
     - Өөрийгөө устгах боломжгүй
     - ЗӨВХӨН өөрөөсөө ЧАНД БАГА зэрэглэлтэй хэрэглэгчийг устгана
       (ADMIN → USER/EDITOR/OPERATOR; SUPER_ADMIN → дээрх + ADMIN).
       Адил эсвэл өндөр зэрэглэлтэйг устгах боломжгүй.
   Cascade-аар session, purchase, payment, subscription, notification бүгд устана. */
export async function deleteUser(opts: {
  actorUserId:  string;
  actorRole:    Role;
  targetUserId: string;
  reason?:      string;
  ip?:          string;
}) {
  if (opts.actorUserId === opts.targetUserId) {
    throw new AppError("Өөрийгөө устгаж болохгүй", 400, "SELF_DELETE");
  }
  const target = await prisma.user.findUnique({ where: { id: opts.targetUserId } });
  if (!target) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  /* Чанд бага зэрэглэлтэй л байх ёстой — адил эсвэл өндөр бол хориглоно */
  if (ROLE_RANK[target.role] >= ROLE_RANK[opts.actorRole]) {
    throw new AppError(
      "Зөвхөн өөрөөсөө бага эрх мэдэлтэй хэрэглэгчийг устгах боломжтой",
      403, "INSUFFICIENT_RANK",
    );
  }

  /* Audit-ийг устгахаас ӨМНӨ бичнэ — target устсаны дараа FK aldaa гарахгүй.
     AuditLog.actorUserId нь actor (устгагч), targetId нь устсан user. */
  await audit({
    actorUserId: opts.actorUserId,
    targetType:  "user",
    targetId:    opts.targetUserId,
    action:      "DELETE",
    before:      { id: target.id, name: target.name, email: target.email, phone: target.phone, role: target.role },
    reason:      opts.reason,
    ip:          opts.ip,
  });

  await prisma.user.delete({ where: { id: opts.targetUserId } });
  return { deleted: true };
}
