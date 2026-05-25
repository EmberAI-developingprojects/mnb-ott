import { prisma } from "../../lib/prisma";
import { getConfigNumber, getSubscriptionPlans } from "../config.service";
import { activateSubscription } from "../subscription.service";
import {
  notifyPaymentReceived, notifySubscriptionActivated, pushNotification,
} from "../notification.service";
import type { AnyMeta, PlanMeta, VodMeta } from "./types";

/* Төлбөр PAID болсны дараах action:
   - VOD кэйс: Purchase upsert + хэрэглэгчид notification
   - PLAN кэйс: activateSubscription + notification
   /check болон /callback 2 газраас дуудагдана. */
export async function handlePaymentSuccess(payment: {
  id:        string;
  userId:    string;
  amount:    number;
  invoiceId: string;
  metadata:  unknown;
}) {
  const meta = (payment.metadata ?? {}) as AnyMeta;

  if ((meta as VodMeta).kind === "VOD") {
    const { vodId, title } = meta as VodMeta;
    const hours = await getConfigNumber("tvod.rental_hours", 72);
    const expiresAt = new Date(Date.now() + hours * 3600_000);
    await prisma.purchase.upsert({
      where:  { userId_vodId: { userId: payment.userId, vodId } },
      update: { status: "ACTIVE", expiresAt, amount: payment.amount },
      create: { userId: payment.userId, vodId, amount: payment.amount, expiresAt },
    });
    await pushNotification({
      userId: payment.userId, type: "CONTENT",
      title:  `${title ?? "Видео"} түрээслэгдлээ`,
      body:   `${hours} цагийн дотор үзэх боломжтой.`,
      link:   `/vod/${vodId}`,
    });
  } else {
    const planMeta = meta as PlanMeta;
    const sub = await activateSubscription(payment.userId, planMeta.planType, planMeta.period, payment.id);
    const plans = await getSubscriptionPlans();
    const plan  = plans.find((p) => p.type === planMeta.planType);
    if (plan && sub.expiresAt) {
      await notifySubscriptionActivated(payment.userId, plan.label, sub.expiresAt);
    }
  }
  await notifyPaymentReceived(payment.userId, payment.amount, payment.invoiceId);
}
