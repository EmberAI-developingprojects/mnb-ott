/* Payment metadata-ийн төрлүүд — Payment.metadata-д JSON хэлбэрээр хадгалагдана.
   3 төрөл:
     PLAN  — VOD subscription (TV/COMBO нь хуучны utga, legacy)
     VOD   — Bundle item TVOD (72 цаг)
     LIVE  — LIVE event PPV (24 цаг хүчинтэй) */
export type PlanMeta = {
  kind?:    "PLAN";
  planType: "VOD";        // шинээр зөвхөн VOD; TV/COMBO нь legacy
  period:   "monthly" | "weekly";
};

export type VodMeta = {
  kind:   "VOD";
  vodId:  string;
  title?: string;
};

export type LiveMeta = {
  kind:      "LIVE";
  channelId: string;
  title?:    string;
};

export type AnyMeta = PlanMeta | VodMeta | LiveMeta;

/* QPay байхгүй / mock горим — local dev болон CI-д шууд PAID болгох. */
export function isMockPayment(): boolean {
  return process.env.PAYMENT_MODE === "mock" ||
         !process.env.QPAY_USERNAME ||
         !process.env.QPAY_BASE_URL;
}
