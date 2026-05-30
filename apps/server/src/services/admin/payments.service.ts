import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";
import type { AnyMeta } from "../payment/types";

export async function listPayments(opts: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const take = Math.min(100, opts.pageSize ?? 30);
  const skip = (page - 1) * take;

  const where = opts.status
    ? { status: opts.status as "PAID" | "PENDING" | "FAILED" | "REFUNDED" }
    : {};

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page, pageSize: take };
}

/* Refund: status-г REFUNDED болгож, холбогдох access-ийг ЗААВАЛ хүчингүй болгоно.
   Өмнө зөвхөн status солидог байсан тул мөнгөө буцаасан хэрэглэгч контентоо
   үргэлжлүүлэн үздэг байсан. Бодит QPay refund API-г дараа холбоно. */
export async function refundPayment(actorUserId: string, paymentId: string, reason: string, ip?: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) throw new AppError("Payment олдсонгүй", 404, "NOT_FOUND");
  if (p.status !== "PAID") throw new AppError("Зөвхөн төлсөн төлбөрийг буцаах боломжтой", 400, "INVALID_STATUS");

  const meta = (p.metadata ?? {}) as AnyMeta;

  /* Payment + холбогдох access-ийг нэг transaction-д хүчингүй болгоно. */
  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.payment.update({
      where: { id: paymentId },
      data:  { status: "REFUNDED" },
    });

    if (meta.kind === "VOD" && meta.vodId) {
      /* Bundle TVOD — Purchase идэвхгүй болгоно (EXPIRED = access хаагдсан) */
      await tx.purchase.updateMany({
        where: { userId: p.userId, vodId: meta.vodId, status: "ACTIVE" },
        data:  { status: "EXPIRED", expiresAt: new Date() },
      });
    } else if (meta.kind === "LIVE" && meta.channelId) {
      /* LIVE PPV — channel Purchase идэвхгүй */
      await tx.purchase.updateMany({
        where: { userId: p.userId, channelId: meta.channelId, status: "ACTIVE" },
        data:  { status: "EXPIRED", expiresAt: new Date() },
      });
    } else {
      /* PLAN (VOD subscription) — BASIC руу буулгана */
      await tx.subscription.updateMany({
        where: { userId: p.userId },
        data:  { planType: "BASIC", status: "CANCELLED", expiresAt: null },
      });
    }
    return upd;
  });

  /* PLAN refund нь subscription-ийг BASIC болгосон тул cache invalidate.
     Эс бөгөөс хэрэглэгч 60с (TTL) хүртэл premium access хадгална. */
  if (meta.kind !== "VOD" && meta.kind !== "LIVE") {
    const { invalidateSubscriptionCache } = await import("../subscription.service");
    await invalidateSubscriptionCache(p.userId);
  }

  await audit({
    actorUserId, targetType: "payment", targetId: paymentId,
    action: "REFUND", before: { status: p.status }, after: { status: "REFUNDED" }, reason, ip,
  });

  return updated;
}
