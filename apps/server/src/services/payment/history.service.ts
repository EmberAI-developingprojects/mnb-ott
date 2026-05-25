import { prisma } from "../../lib/prisma";

type HistoryItem = {
  id:         string;
  type:       "vod_rental" | "subscription";
  title:      string;
  amount:     number;
  status:     string;
  paidAt:     Date | null;
  createdAt:  Date;
  expiresAt?: Date | null;
  method:     string | null;
};

/* Худалдан авалтын түүх — захиалга + VOD purchase.
   Payment-д аль хэдийн орсон Purchase-уудыг давхардуулахгүй фильтердэнэ
   (mock горимоор үүсгэсэн Payment + Purchase pair). */
export async function getPaymentHistory(userId: string): Promise<HistoryItem[]> {
  const [payments, purchases] = await Promise.all([
    prisma.payment.findMany({
      where:   { userId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take:    100,
    }),
    prisma.purchase.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      include: { vod: true },
      take:    100,
    }),
  ]);

  const items: HistoryItem[] = [
    ...payments.map((p) => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const isVod = meta.kind === "VOD";
      return {
        id:        p.id,
        type:      (isVod ? "vod_rental" : "subscription") as HistoryItem["type"],
        title:     isVod
                    ? ((meta.title as string) ?? "Видео түрээс")
                    : `${(meta.planType as string) ?? "Plan"} (${(meta.period as string) ?? ""})`,
        amount:    p.amount,
        status:    p.status,
        paidAt:    p.paidAt,
        createdAt: p.createdAt,
        method:    p.provider,
      };
    }),
    ...purchases
      .filter((pp) => !payments.some((pay) => {
        const m = (pay.metadata ?? {}) as Record<string, unknown>;
        return m.kind === "VOD" && m.vodId === pp.vodId;
      }))
      .map((pp): HistoryItem => ({
        id:        pp.id,
        type:      "vod_rental",
        title:     pp.vod.title,
        amount:    pp.amount,
        status:    pp.status,
        paidAt:    pp.createdAt,
        createdAt: pp.createdAt,
        expiresAt: pp.expiresAt,
        method:    "manual",
      })),
  ];

  items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return items;
}
