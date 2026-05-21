import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getConfigNumber, getSubscriptionPlans } from "./config.service";
import { AppError } from "../middleware/error.middleware";

export async function getMySubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!sub) {
    // Байхгүй бол FREE үүсгэж буцаана
    return prisma.subscription.create({ data: { userId, planType: "FREE" } });
  }
  return sub;
}

export async function checkDeviceLimit(userId: string, deviceId: string): Promise<boolean> {
  const sub = await getMySubscription(userId);

  const limitKey = `plan.${sub.planType.toLowerCase()}.device_limit`;
  const limit = await getConfigNumber(limitKey, 1);

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
export async function activateSubscription(
  userId: string,
  planType: "STANDARD" | "PREMIUM",
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
