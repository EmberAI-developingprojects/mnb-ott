/* Payment metadata-ийн төрлүүд — Payment.metadata talbar-d JSON хэлбэрээр хадгалагдана.
   SVOD (plan түрээс) vs TVOD (нэг VOD) гэх 2 төрөл. */
export type PlanMeta = {
  kind?:    "PLAN";
  planType: "TV" | "VOD" | "COMBO";
  period:   "monthly" | "weekly";
};

export type VodMeta = {
  kind:   "VOD";
  vodId:  string;
  title?: string;
};

export type AnyMeta = PlanMeta | VodMeta;

/* QPay байхгүй / mock горим — local dev болон CI-д шууд PAID болгох. */
export function isMockPayment(): boolean {
  return process.env.PAYMENT_MODE === "mock" ||
         !process.env.QPAY_USERNAME ||
         !process.env.QPAY_BASE_URL;
}
