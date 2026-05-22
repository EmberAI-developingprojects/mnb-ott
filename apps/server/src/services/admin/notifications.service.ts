import { prisma } from "../../lib/prisma";
import { audit } from "./audit.service";

/* Олон хэрэглэгчид нэгэн зэрэг мэдэгдэл илгээх. planFilter заасан бол тухайн
   plan-тэй идэвхтэй subscription-тай хэрэглэгчдэд л илгээнэ. */
export async function broadcastNotification(actorUserId: string, data: {
  title:       string;
  body:        string;
  type?:       "SYSTEM" | "PROMO" | "CONTENT";
  planFilter?: ("BASIC" | "TV" | "VOD" | "COMBO")[];
}, ip?: string) {
  const userIds = data.planFilter && data.planFilter.length > 0
    ? (await prisma.subscription.findMany({
        where:  { planType: { in: data.planFilter }, status: "ACTIVE" },
        select: { userId: true },
      })).map((s) => s.userId)
    : (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type:  data.type ?? "SYSTEM",
      title: data.title,
      body:  data.body,
    })),
  });

  await audit({
    actorUserId, targetType: "notification", action: "BROADCAST",
    after: { recipients: userIds.length, title: data.title, planFilter: data.planFilter },
    ip,
  });

  return { sent: userIds.length };
}
