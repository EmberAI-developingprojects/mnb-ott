import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { audit } from "./audit.service";

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

/* MVP: зөвхөн status-г REFUNDED болгоно. Бодит QPay refund API-г дараа холбоно. */
export async function refundPayment(actorUserId: string, paymentId: string, reason: string, ip?: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) throw new AppError("Payment олдсонгүй", 404, "NOT_FOUND");
  if (p.status !== "PAID") throw new AppError("Зөвхөн төлсөн төлбөрийг буцаах боломжтой", 400, "INVALID_STATUS");

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data:  { status: "REFUNDED" },
  });

  await audit({
    actorUserId, targetType: "payment", targetId: paymentId,
    action: "REFUND", before: { status: p.status }, after: { status: "REFUNDED" }, reason, ip,
  });

  return updated;
}
