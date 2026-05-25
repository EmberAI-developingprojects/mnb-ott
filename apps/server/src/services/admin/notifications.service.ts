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
  link?:       string;
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
        link:  data.link || null,
      })),
    });
  }

  await audit({
    actorUserId, targetType: "notification", action: "BROADCAST",
    after: {
      recipients: userIds.length,
      title:      data.title,
      body:       data.body,
      type:       data.type ?? "SYSTEM",
      planFilter: data.planFilter,
      link:       data.link,
    },
    ip,
  });

  return { sent: userIds.length };
}

/* Илгээсэн broadcast-ын түүх — audit log-аас уншина (тус бүрчилсэн storage гэхгүй,
   audit нь аль хэдийн actor + timestamp + payload-ыг хадгалдаг). */
export async function listSentBroadcasts(limit = 20, cursor?: string) {
  const rows = await prisma.auditLog.findMany({
    where:   { targetType: "notification", action: "BROADCAST" },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: { id: true, name: true, email: true, phone: true } } },
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;

  const items = rows.map((r) => {
    const after = (r.after ?? {}) as Record<string, unknown>;
    return {
      id:         r.id,
      sentAt:     r.createdAt,
      actor:      r.actor ? {
        id:    r.actor.id,
        name:  r.actor.name,
        email: r.actor.email,
        phone: r.actor.phone,
      } : null,
      title:      String(after.title ?? ""),
      body:       String(after.body ?? ""),
      type:       String(after.type ?? "SYSTEM"),
      link:       (after.link as string | undefined) ?? null,
      planFilter: (after.planFilter as string[] | undefined) ?? null,
      recipients: Number(after.recipients ?? 0),
    };
  });

  return { items, nextCursor };
}
