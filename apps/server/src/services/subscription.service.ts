import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getConfigNumber, getSubscriptionPlans } from "./config.service";
import { AppError } from "../middleware/error.middleware";

export async function getMySubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!sub) {
    // Анхдагч plan: BASIC — нэвтэрсэн хэрэглэгчид YouTube архив үнэгүй
    return prisma.subscription.create({ data: { userId, planType: "BASIC" } });
  }
  return sub;
}

export async function checkDeviceLimit(userId: string, deviceId: string): Promise<boolean> {
  const sub = await getMySubscription(userId);

  const limitKey = `plan.${sub.planType.toLowerCase()}.device_limit`;
  const fallback = sub.planType === "BASIC" ? 1 : sub.planType === "COMBO" ? 4 : 2;
  const limit = await getConfigNumber(limitKey, fallback);

  // Одоогийн идэвхтэй session тоо
  const activeSessions = await prisma.userSession.count({
    where: { userId, isActive: true },
  });

  // Энэ device аль хэдийн session-тэй бол OK
  const hasSession = await prisma.userSession.findFirst({
    where: { userId, deviceId, isActive: true },
  });
  if (hasSession) return true;

  return activeSessions < limit;
}

// Subscription-ийн мэдээлэл + планы нийлүүлэн буцаана
export async function getMySubscriptionDetail(userId: string) {
  const [sub, plans] = await Promise.all([
    getMySubscription(userId),
    getSubscriptionPlans(),
  ]);

  const currentPlan = plans.find((p) => p.type === sub.planType) ?? plans[0];
  const isActive = sub.status === "ACTIVE";
  const isExpired = sub.expiresAt ? sub.expiresAt < new Date() : false;

  return {
    subscription: sub,
    plan: currentPlan,
    isActive: isActive && !isExpired,
    expiresAt: sub.expiresAt,
    plans,
  };
}

// Subscription шинэчлэх (QPay төлбөр хийгдсэний дараа дуудагдана)
// BASIC үнэгүй учраас энд активлахгүй
export async function activateSubscription(
  userId: string,
  planType: "TV" | "VOD" | "COMBO",
  period: "monthly" | "weekly",
  paymentId: string
) {
  const plans = await getSubscriptionPlans();
  const plan = plans.find((p) => p.type === planType);
  if (!plan) throw new AppError("Plan олдсонгүй", 404, "NOT_FOUND");

  const days = period === "monthly" ? 30 : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: { planType, status: "ACTIVE", expiresAt, startedAt: new Date() },
    create: { userId, planType, status: "ACTIVE", expiresAt, startedAt: new Date() },
  });

  // Cache цэвэрлэнэ
  await redis.del(`sub:${userId}`);

  return sub;
}

// ─────────────────────────────────────────────────────
// Access control — plan + TVOD purchase-ийг харгалзан үздэг
// ─────────────────────────────────────────────────────

/* Frontend-ээс ирэх access kind утга:
   archive   = YouTube архив (нэвтэрсэн бүхэнд үнэгүй)
   library   = Премиум VOD сан (VOD/COMBO plan-тай үнэгүй)
   bundle    = Багц доторх видео (VOD/COMBO эсвэл тус видеог түрээслэх)
   live-tv   = Шууд цацалт + DVR (TV/COMBO plan)
*/
export type ContentAccessKind = "archive" | "library" | "bundle" | "live-tv";

export interface AccessDecision {
  allowed: boolean;
  reason?: "PLAN_REQUIRED" | "PURCHASE_REQUIRED" | "EXPIRED";
  requiredPlans?: string[];
}

/**
 * Plan + субюнкрэйшний хүчинтэй эсэх + purchase-ийг шалгаад нэвтрэх
 * боломжийг буцаана. VOD дотор purchase эсвэл bundle худалдаж авсан бол
 * plan-аас үл хамаараад зөвшөөрнө.
 */
export async function checkContentAccess(
  userId: string | null,
  kind: ContentAccessKind,
  vodId?: string,
): Promise<AccessDecision> {
  // Нэвтрээгүй — бүх контент хаалттай
  if (!userId) return { allowed: false, reason: "PLAN_REQUIRED" };

  const sub = await getMySubscription(userId);
  const isExpired = sub.expiresAt ? sub.expiresAt < new Date() : false;
  const effectivePlan = isExpired ? "BASIC" : sub.planType;
  const caps = (await getSubscriptionPlans()).find((p) => p.type === effectivePlan)?.capabilities;

  if (kind === "archive" && caps?.youtubeArchive)  return { allowed: true };
  if (kind === "live-tv" && caps?.liveTv)          return { allowed: true };
  if (kind === "library" && caps?.premiumVod)      return { allowed: true };

  // Багц доторх видео — plan хамаагүй, ЗӨВХӨН нэг бүрчлэн TVOD-аар авна
  if (kind === "bundle" && vodId) {
    const direct = await prisma.purchase.findUnique({
      where: { userId_vodId: { userId, vodId } },
    });
    if (direct && direct.status === "ACTIVE" &&
        (!direct.expiresAt || direct.expiresAt > new Date())) {
      return { allowed: true };
    }
    return { allowed: false, reason: "PURCHASE_REQUIRED" };
  }

  if (kind === "live-tv") {
    return { allowed: false, reason: "PLAN_REQUIRED", requiredPlans: ["TV", "COMBO"] };
  }
  if (kind === "library") {
    return { allowed: false, reason: "PLAN_REQUIRED", requiredPlans: ["VOD", "COMBO"] };
  }
  return { allowed: false, reason: "PLAN_REQUIRED", requiredPlans: ["BASIC", "TV", "VOD", "COMBO"] };
}
