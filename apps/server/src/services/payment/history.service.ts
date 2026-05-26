import { prisma } from "../../lib/prisma";

type HistoryItem = {
  id:         string;
  type:       "vod_rental" | "live_ppv" | "subscription";
  title:      string;
  amount:     number;
  status:     string;
  paidAt:     Date | null;
  createdAt:  Date;
  expiresAt?: Date | null;
  method:     string | null;
};

/* Худалдан авалтын түүх — захиалга + VOD purchase + LIVE PPV.
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
      include: { vod: true, channel: true },
      take:    100,
    }),
  ]);

  const items: HistoryItem[] = [
    ...payments.map((p): HistoryItem => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const kind = String(meta.kind ?? "PLAN");
      const type: HistoryItem["type"] =
        kind === "VOD"  ? "vod_rental" :
        kind === "LIVE" ? "live_ppv"   : "subscription";
      const title =
        kind === "VOD"  ? ((meta.title as string) ?? "Видео түрээс") :
        kind === "LIVE" ? ((meta.title as string) ?? "LIVE event")  :
        `${(meta.planType as string) ?? "Plan"} (${(meta.period as string) ?? ""})`;
      return {
        id:        p.id,
        type,
        title,
        amount:    p.amount,
        status:    p.status,
        paidAt:    p.paidAt,
        createdAt: p.createdAt,
        method:    p.provider,
      };
    }),
    /* Payment-аар бүртгэгдээгүй Purchase-уудыг дүүргэх (legacy) */
    ...purchases
      .filter((pp) => !payments.some((pay) => {
        const m = (pay.metadata ?? {}) as Record<string, unknown>;
        if (m.kind === "VOD"  && pp.vodId)     return m.vodId === pp.vodId;
        if (m.kind === "LIVE" && pp.channelId) return m.channelId === pp.channelId;
        return false;
      }))
      .map((pp): HistoryItem => ({
        id:        pp.id,
        type:      pp.channelId ? "live_ppv" : "vod_rental",
        title:     pp.vod?.title ?? pp.channel?.name ?? "—",
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
