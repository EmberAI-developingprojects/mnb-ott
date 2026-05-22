import { prisma } from "../../lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* Admin dashboard-ийн ерөнхий тоонууд. Олон query Promise.all-аар параллел. */
export async function getDashboardStats() {
  const [
    totalUsers, blockedUsers, activeSubs,
    totalPaymentsAgg, todayPaymentsAgg,
    vodCount, channelCount, bundleCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfToday() } },
      _sum:  { amount: true },
      _count: true,
    }),
    prisma.vodContent.count(),
    prisma.channel.count(),
    prisma.vodBundle.count(),
  ]);

  const planBreakdown = await prisma.subscription.groupBy({
    by: ["planType"],
    where:  { status: "ACTIVE" },
    _count: true,
  });

  return {
    users:   { total: totalUsers, blocked: blockedUsers, activeSubs },
    revenue: {
      total:      totalPaymentsAgg._sum.amount ?? 0,
      today:      todayPaymentsAgg._sum.amount ?? 0,
      todayCount: todayPaymentsAgg._count,
    },
    content: { vod: vodCount, channels: channelCount, bundles: bundleCount },
    plans:   planBreakdown.map((p) => ({ plan: p.planType, count: p._count })),
  };
}
