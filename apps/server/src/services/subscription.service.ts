import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getConfigNumber, getSubscriptionPlans } from "./config.service";
import { AppError } from "../middleware/error.middleware";

/* Plan loaded by Prisma client (enum-ийн legacy утга TV/COMBO үлдсэн) */
type StoredPlan = "BASIC" | "TV" | "VOD" | "COMBO";
/* UI болон шинэ API-д харагдах plan */
type ActivePlan = "BASIC" | "VOD";

/* Legacy → шинэ загвар:
   - TV    → BASIC (TV үнэгүй болсон)
   - COMBO → VOD   (премиум үлдэнэ) */
function normalizePlan(plan: StoredPlan): ActivePlan {
  if (plan === "VOD" || plan === "COMBO") return "VOD";
  return "BASIC";
}

export async function getMySubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    /* Анхдагч plan: BASIC — нэвтэрсэн хэрэглэгчдэд TV/Radio + архив үнэгүй */
    return prisma.subscription.create({ data: { userId, planType: "BASIC" } });
  }
  return sub;
}

export async function checkDeviceLimit(userId: string, deviceId: string): Promise<boolean> {
  const sub = await getMySubscription(userId);
  const effective = normalizePlan(sub.planType as StoredPlan);

  const limitKey = `plan.${effective.toLowerCase()}.device_limit`;
  const fallback = effective === "VOD" ? 3 : 2;
  const limit = await getConfigNumber(limitKey, fallback);

  const activeSessions = await prisma.userSession.count({
    where: { userId, isActive: true },
  });

  /* Энэ device аль хэдийн session-тэй бол лимит шалгахгүй (re-login) */
  const hasSession = await prisma.userSession.findFirst({
    where: { userId, deviceId, isActive: true },
  });
  if (hasSession) return true;

  return activeSessions < limit;
}

/* Subscription дэлгэрэнгүй — UI-д харагдах хувилбараар (legacy plan-ийг normalize) */
export async function getMySubscriptionDetail(userId: string) {
  const [sub, plans] = await Promise.all([
    getMySubscription(userId),
    getSubscriptionPlans(),
  ]);

  const effective   = normalizePlan(sub.planType as StoredPlan);
  const currentPlan = plans.find((p) => p.type === effective) ?? plans[0];
  const isActive    = sub.status === "ACTIVE";
  const isExpired   = sub.expiresAt ? sub.expiresAt < new Date() : false;

  return {
    subscription: { ...sub, planType: effective },
    plan:         currentPlan,
    isActive:     isActive && !isExpired,
    expiresAt:    sub.expiresAt,
    plans,
  };
}

/* Subscription идэвхжүүлэх. Зөвхөн VOD plan-д хэрэглэнэ (BASIC үнэгүй).
   TV/COMBO нь legacy тул шинээр оноогохгүй. */
export async function activateSubscription(
  userId: string,
  planType: "VOD",
  period: "monthly" | "weekly",
  _paymentId: string,
) {
  if (planType !== "VOD") {
    throw new AppError("Plan буруу — зөвхөн VOD", 400, "INVALID_PLAN");
  }
  const plans = await getSubscriptionPlans();
  const plan = plans.find((p) => p.type === planType);
  if (!plan) throw new AppError("Plan олдсонгүй", 404, "NOT_FOUND");

  const days = period === "monthly" ? 30 : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const sub = await prisma.subscription.upsert({
    where:  { userId },
    update: { planType, status: "ACTIVE", expiresAt, startedAt: new Date() },
    create: { userId, planType, status: "ACTIVE", expiresAt, startedAt: new Date() },
  });

  await redis.del(`sub:${userId}`);
  return sub;
}

/* ─── Access control ───────────────────────────────────────────
   Frontend-ээс ирэх access kind утга:
     archive  = YouTube архив (нэвтэрсэн бүх хэрэглэгч үнэгүй)
     live-tv  = TV/RADIO суваг + DVR (нэвтэрсэн бүх хэрэглэгч үнэгүй)
     live     = LIVE event PPV (Channel.id-аар Purchase шалгана)
     library  = Премиум VOD сан (VOD plan шаардлагатай)
     bundle   = Багц видео (VodContent.id-аар Purchase шалгана) */
export type ContentAccessKind = "archive" | "library" | "bundle" | "live-tv" | "live";

export interface AccessDecision {
  allowed:        boolean;
  reason?:        "PLAN_REQUIRED" | "PURCHASE_REQUIRED" | "EXPIRED";
  requiredPlans?: string[];
}

export async function checkContentAccess(
  userId: string | null,
  kind: ContentAccessKind,
  contentId?: string,
): Promise<AccessDecision> {
  /* Нэвтрээгүй — бүх контент хаалттай (зочин login-руу redirect) */
  if (!userId) return { allowed: false, reason: "PLAN_REQUIRED" };

  /* Шинэ загвар: archive + live-tv бүх нэвтэрсэн хэрэглэгчид үнэгүй */
  if (kind === "archive" || kind === "live-tv") {
    return { allowed: true };
  }

  /* LIVE event PPV — Channel.id-аар Purchase шалгана (24 цаг хүчинтэй) */
  if (kind === "live" && contentId) {
    const purchase = await prisma.purchase.findUnique({
      where: { userId_channelId: { userId, channelId: contentId } },
    });
    if (purchase && purchase.status === "ACTIVE" &&
        (!purchase.expiresAt || purchase.expiresAt > new Date())) {
      return { allowed: true };
    }
    return { allowed: false, reason: "PURCHASE_REQUIRED" };
  }

  /* Bundle видео — VodContent.id-аар Purchase (72 цаг) */
  if (kind === "bundle" && contentId) {
    const purchase = await prisma.purchase.findUnique({
      where: { userId_vodId: { userId, vodId: contentId } },
    });
    if (purchase && purchase.status === "ACTIVE" &&
        (!purchase.expiresAt || purchase.expiresAt > new Date())) {
      return { allowed: true };
    }
    return { allowed: false, reason: "PURCHASE_REQUIRED" };
  }

  /* Премиум VOD сан — VOD plan шаардлагатай */
  if (kind === "library") {
    const sub = await getMySubscription(userId);
    const effective = normalizePlan(sub.planType as StoredPlan);
    const isExpired = sub.expiresAt ? sub.expiresAt < new Date() : false;
    if (effective === "VOD" && !isExpired) {
      return { allowed: true };
    }
    return { allowed: false, reason: "PLAN_REQUIRED", requiredPlans: ["VOD"] };
  }

  return { allowed: false, reason: "PLAN_REQUIRED" };
}
