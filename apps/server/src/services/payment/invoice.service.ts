import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import * as qpay from "../qpay.service";
import { getConfigNumber, getSubscriptionPlans } from "../config.service";
import { pushNotification } from "../notification.service";
import { isMockPayment } from "./types";

type QpayInvoiceResponse = {
  paymentId:      string;
  invoiceId:      string;
  qpayInvoiceId:  string;
  qrText:         string;
  qrImage:        string;
  deeplinks:      Array<{ name: string; description: string; logo: string; link: string }>;
  amount:         number;
};

/* SVOD plan-ы invoice (сар/7 хоног). QPay invoice үүсгээд QR + deeplinks буцаана. */
export async function createPlanInvoice(
  userId:   string,
  planType: "TV" | "VOD" | "COMBO",
  period:   "monthly" | "weekly",
): Promise<QpayInvoiceResponse> {
  const plans = await getSubscriptionPlans();
  const plan  = plans.find((p) => p.type === planType);
  if (!plan) throw new AppError("Plan олдсонгүй", 404, "NOT_FOUND");

  const amount = period === "monthly" ? plan.priceMonthly : plan.priceWeekly;

  const payment = await prisma.payment.create({
    data: { userId, amount, metadata: { planType, period } },
  });

  const invoice = await qpay.createInvoice({
    invoiceId:   payment.invoiceId,
    amount,
    description: `МҮОНРТ OTT ${plan.label} (${period === "monthly" ? "сарын" : "7 хоногийн"})`,
    callbackUrl: `${process.env.QPAY_CALLBACK_URL}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data:  { qpayInvoiceId: invoice.invoice_id },
  });

  return {
    paymentId:     payment.id,
    invoiceId:     payment.invoiceId,
    qpayInvoiceId: invoice.invoice_id,
    qrText:        invoice.qr_text,
    qrImage:       invoice.qr_image,
    deeplinks:     invoice.urls,
    amount,
  };
}

type VodInvoiceMockResult = {
  mock:       true;
  paid:       true;
  paymentId:  string;
  invoiceId:  string;
  amount:     number;
};

type VodInvoiceLiveResult = QpayInvoiceResponse & { mock: false };

/* TVOD — нэг VOD-ыг 72 цагаар түрээслэх invoice.
   - Идэвхтэй Purchase байгаа бол throw ALREADY_RENTED
   - mock горимд шууд PAID болгож Purchase үүсгэнэ
   - Production-д QPay invoice буцаана */
export async function createVodInvoice(
  userId: string,
  vodId:  string,
  price:  number,
  title?: string,
): Promise<VodInvoiceMockResult | VodInvoiceLiveResult> {
  /* Bundle items нь YouTube ID хэлбэрээр ирдэг (classifyContent дотор pool-оос).
     Purchase.vodId нь VodContent.id FK тул tomorrow YouTube ID-аар Purchase
     үүсгэх боломжгүй. Шийдэл: 11-char YouTube ID байвал VodContent stub
     auto-upsert хийнэ — id-г YouTube ID-тай адил болгож хадгална. */
  const isYoutubeId = /^[a-zA-Z0-9_-]{11}$/.test(vodId);
  if (isYoutubeId) {
    await prisma.vodContent.upsert({
      where:  { id: vodId },
      update: {},
      create: {
        id:    vodId,
        title: title ?? "YouTube видео",
        type:  "FREE",
        price,
      },
    });
  } else {
    const vod = await prisma.vodContent.findUnique({
      where: { id: vodId }, select: { id: true },
    });
    if (!vod) {
      throw new AppError("Видео олдсонгүй", 404, "VOD_NOT_FOUND");
    }
  }

  const owned = await prisma.purchase.findUnique({
    where: { userId_vodId: { userId, vodId } },
  });
  if (owned && owned.status === "ACTIVE" &&
      (!owned.expiresAt || owned.expiresAt > new Date())) {
    throw new AppError("Аль хэдийн түрээслэсэн", 400, "ALREADY_RENTED");
  }

  if (isMockPayment()) {
    const hours = await getConfigNumber("tvod.rental_hours", 72);
    const expiresAt = new Date(Date.now() + hours * 3600_000);

    const payment = await prisma.payment.create({
      data: {
        userId, amount: price,
        status:   "PAID", paidAt: new Date(),
        metadata: { kind: "VOD", vodId, title },
      },
    });

    await prisma.purchase.upsert({
      where:  { userId_vodId: { userId, vodId } },
      update: { status: "ACTIVE", expiresAt, amount: price },
      create: { userId, vodId, amount: price, expiresAt },
    });

    try {
      await pushNotification({
        userId, type: "CONTENT",
        title: `${title ?? "Видео"} түрээслэгдлээ`,
        body:  `${hours} цагийн дотор үзэх боломжтой.`,
        link:  `/vod/${vodId}`,
      });
    } catch { /* notification алдаа payment-ийг блоклохгүй */ }

    return {
      mock: true, paid: true,
      paymentId: payment.id, invoiceId: payment.invoiceId, amount: price,
    };
  }

  const payment = await prisma.payment.create({
    data: { userId, amount: price, metadata: { kind: "VOD", vodId, title } },
  });

  const invoice = await qpay.createInvoice({
    invoiceId:   payment.invoiceId,
    amount:      price,
    description: `МҮОНРТ түрээс: ${title ?? vodId}`,
    callbackUrl: `${process.env.QPAY_CALLBACK_URL}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data:  { qpayInvoiceId: invoice.invoice_id },
  });

  return {
    mock: false,
    paymentId:     payment.id,
    invoiceId:     payment.invoiceId,
    qpayInvoiceId: invoice.invoice_id,
    qrText:        invoice.qr_text,
    qrImage:       invoice.qr_image,
    deeplinks:     invoice.urls,
    amount:        price,
  };
}

/* Invoice цуцлах — өөрийнхөө invoice л байх ёстой. */
export async function cancelInvoice(userId: string, invoiceId: string) {
  const payment = await prisma.payment.findUnique({ where: { invoiceId } });
  if (!payment || payment.userId !== userId) {
    throw new AppError("Invoice олдсонгүй", 404, "NOT_FOUND");
  }
  if (payment.qpayInvoiceId) await qpay.cancelInvoice(payment.qpayInvoiceId);
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
}
