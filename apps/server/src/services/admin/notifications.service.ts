import { prisma } from "../../lib/prisma";
import { audit } from "./audit.service";

/* Олон хэрэглэгчид нэгэн зэрэг мэдэгдэл илгээх. planFilter заасан бол тухайн
   plan-тэй идэвхтэй subscription-тай хэрэглэгчдэд л илгээнэ.

   Performance: 100k+ хэрэглэгчтэй болоход бүх userId-г memory-руу татах нь
   risk. Тиймээс 5,000-аар chunk хийгээд параллел Promise.all. */

const BROADCAST_CHUNK_SIZE = 5000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function broadcastNotification(actorUserId: string, data: {
  title:       string;
  body:        string;
  type?:       "SYSTEM" | "PROMO" | "CONTENT";
  planFilter?: ("BASIC" | "TV" | "VOD" | "COMBO")[];
}, ip?: string) {
  /* Idэвхгүй (isBlocked=true) хэрэглэгчдэд мэдэгдэл явуулахгүй */
  const userIds = data.planFilter && data.planFilter.length > 0
    ? (await prisma.subscription.findMany({
        where:  {
          planType: { in: data.planFilter },
          status:   "ACTIVE",
          user:     { isBlocked: false },
        },
        select: { userId: true },
      })).map((s) => s.userId)
    : (await prisma.user.findMany({
        where:  { isBlocked: false },
        select: { id: true },
      })).map((u) => u.id);

  /* Chunk-аар createMany — memory + lock contention багасгана */
  const chunks = chunk(userIds, BROADCAST_CHUNK_SIZE);
  for (const batch of chunks) {
    await prisma.notification.createMany({
      data: batch.map((userId) => ({
        userId,
        type:  data.type ?? "SYSTEM",
        title: data.title,
        body:  data.body,
      })),
    });
  }

  await audit({
    actorUserId, targetType: "notification", action: "BROADCAST",
    after: { recipients: userIds.length, title: data.title, planFilter: data.planFilter },
    ip,
  });

  return { sent: userIds.length };
}
