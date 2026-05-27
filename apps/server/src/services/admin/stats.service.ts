import { prisma } from "../../lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/* Сүүлийн N хоногийн орлогын өсөлт. Spark chart-д ашиглана. */
export async function getRevenueTrend(days = 7): Promise<{ date: string; amount: number; count: number }[]> {
  const since = daysAgo(days - 1);
  const payments = await prisma.payment.findMany({
    where:  { status: "PAID", paidAt: { gte: since } },
    select: { amount: true, paidAt: true },
  });

  /* Бүх хоног-уудыг 0-аар эхлүүлж, payments-аар нөхнө */
  const buckets = new Map<string, { amount: number; count: number }>();
  for (let i = 0; i < days; i++) {
    const d = daysAgo(days - 1 - i);
    buckets.set(d.toISOString().slice(0, 10), { amount: 0, count: 0 });
  }

  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = p.paidAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.amount += p.amount;
      bucket.count  += 1;
    }
  }

  return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
}

/* Admin dashboard-ийн ерөнхий тоонууд. Олон query Promise.all-аар параллел.
   Channel-уудыг kind-ээр groupBy хийж тус тусдаа буцаана — TV, Radio, LIVE
   нь өөр өөр concept (LIVE PPV event, TV/Radio 24/7 broadcast). */
export async function getDashboardStats() {
  const [
    totalUsers, blockedUsers, activeSubs,
    totalPaymentsAgg, todayPaymentsAgg,
    vodCount, channelGroups, bundleCount,
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
    prisma.channel.groupBy({ by: ["kind"], _count: true }),
    prisma.vodBundle.count(),
  ]);

  const planBreakdown = await prisma.subscription.groupBy({
    by: ["planType"],
    where:  { status: "ACTIVE" },
    _count: true,
  });

  /* Channel-уудыг kind-ээр сегментлэнэ */
  const tvCount    = channelGroups.find((g) => g.kind === "TV")?._count    ?? 0;
  const radioCount = channelGroups.find((g) => g.kind === "RADIO")?._count ?? 0;
  const liveCount  = channelGroups.find((g) => g.kind === "LIVE")?._count  ?? 0;

  return {
    users:   { total: totalUsers, blocked: blockedUsers, activeSubs },
    revenue: {
      total:      totalPaymentsAgg._sum.amount ?? 0,
      today:      todayPaymentsAgg._sum.amount ?? 0,
      todayCount: todayPaymentsAgg._count,
    },
    content: {
      vod:     vodCount,
      bundles: bundleCount,
      tv:      tvCount,
      radio:   radioCount,
      live:    liveCount,
      /* legacy — бүгдийн нийлбэр (хуучин frontend backward compat) */
      channels: tvCount + radioCount + liveCount,
    },
    plans: planBreakdown.map((p) => ({ plan: p.planType, count: p._count })),
  };
}
