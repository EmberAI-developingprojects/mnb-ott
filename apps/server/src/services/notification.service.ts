import { prisma } from "../lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateInput {
  userId: string;
  type:   NotificationType;
  title:  string;
  body:   string;
  link?:  string;
}

export async function pushNotification(input: CreateInput) {
  return prisma.notification.create({ data: input });
}

export async function pushToMany(userIds: string[], input: Omit<CreateInput, "userId">) {
  if (userIds.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({ ...input, userId })),
  });
}

// Subscription идэвхжсэн үед автомат мэдэгдэл
export async function notifySubscriptionActivated(
  userId: string,
  planLabel: string,
  expiresAt: Date,
) {
  return pushNotification({
    userId,
    type:  "SUBSCRIPTION",
    title: `${planLabel} багц идэвхжлээ`,
    body:  `Захиалга ${expiresAt.toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" })} хүртэл хүчинтэй.`,
    link:  "/profile/subscription",
  });
}

// Төлбөр амжилттай хийгдсэн үед
export async function notifyPaymentReceived(
  userId: string,
  amount: number,
  ref: string,
) {
  return pushNotification({
    userId,
    type:  "PAYMENT",
    title: "Төлбөр амжилттай",
    body:  `${amount.toLocaleString("mn-MN")}₮ төлбөр амжилттай хийгдлээ. Гүйлгээний дугаар: ${ref}`,
    link:  "/profile/subscription",
  });
}
