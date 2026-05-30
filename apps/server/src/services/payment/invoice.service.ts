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

/* Subscription invoice — шинэ загварт зөвхөн VOD plan. */
export async function createPlanInvoice(
  userId:   string,
  planType: "VOD",
  period:   "monthly" | "weekly",
): Promise<QpayInvoiceResponse> {
  if (planType !== "VOD") {
    throw new AppError("Plan буруу — зөвхөн VOD захиалга боломжтой", 400, "INVALID_PLAN");
  }
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
  _clientPrice: number,  /* client утга — зөвхөн backward-compat, ҮЛ ТООМСОРЛОНО */
  title?: string,
): Promise<VodInvoiceMockResult | VodInvoiceLiveResult> {
  /* SECURITY: Үнийг ХЭЗЭЭ Ч client body-оос авахгүй. Attacker price=100 явуулж
     үнэтэй контентыг хямдаар авах боломжгүй болгоно. Bundle item бол
     classifyContent-аас, VodContent бол DB-ийн price-аас server талд тооцоолно. */
  const isYoutubeId = /^[a-zA-Z0-9_-]{11}$/.test(vodId);
  let price: number;

  if (isYoutubeId) {
    /* Bundle YouTube видео — classifyContent-аас бодит үнэ + bundle эсэхийг шалгах */
    const { classifyContent } = await import("../library.service");
    const cls = await classifyContent(vodId);
    if (cls.kind !== "bundle" || !cls.price) {
      /* archive/library YouTube видео нь TVOD биш — түрээслэх боломжгүй */
      throw new AppError("Энэ видео түрээслэх боломжгүй", 400, "NOT_RENTABLE");
    }
    price = cls.price;

    /* Purchase.vodId нь VodContent.id FK тул YouTube ID-аар stub upsert хийнэ. */
    await prisma.vodContent.upsert({
      where:  { id: vodId },
      update: {},
      create: { id: vodId, title: title ?? "YouTube видео", type: "FREE", price },
    });
  } else {
    const vod = await prisma.vodContent.findUnique({
      where: { id: vodId }, select: { id: true, price: true },
    });
    if (!vod) {
      throw new AppError("Видео олдсонгүй", 404, "VOD_NOT_FOUND");
    }
    if (!vod.price || vod.price <= 0) {
      throw new AppError("Энэ видео түрээслэх боломжгүй", 400, "NOT_RENTABLE");
    }
    price = vod.price;
  }
  void _clientPrice;

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

/* LIVE event PPV — Channel.id-аар Purchase + 24 цаг хүчинтэй.
   - Channel байх ёстой, kind LIVE, price тогтоосон байх
   - Аль хэдийн идэвхтэй Purchase бол ALREADY_PURCHASED
   - Mock mode-д шууд PAID болгож Purchase + Payment үүсгэнэ */
export async function createLiveInvoice(
  userId:    string,
  channelId: string,
): Promise<VodInvoiceMockResult | VodInvoiceLiveResult> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, kind: true, price: true, isActive: true },
  });
  if (!channel) throw new AppError("Live олдсонгүй", 404, "LIVE_NOT_FOUND");
  if (channel.kind !== "LIVE") {
    throw new AppError("Зөвхөн LIVE event-ийг худалдаж авна", 400, "NOT_LIVE_CHANNEL");
  }
  if (!channel.isActive) {
    throw new AppError("Live идэвхгүй байна", 400, "LIVE_INACTIVE");
  }
  if (!channel.price || channel.price < 100) {
    throw new AppError("Live event үнэгүй байна", 400, "LIVE_NO_PRICE");
  }

  const owned = await prisma.purchase.findUnique({
    where: { userId_channelId: { userId, channelId } },
  });
  if (owned && owned.status === "ACTIVE" &&
      (!owned.expiresAt || owned.expiresAt > new Date())) {
    throw new AppError("Аль хэдийн худалдаж авсан", 400, "ALREADY_PURCHASED");
  }

  const hours = await getConfigNumber("live.access_hours", 24);
  const price = channel.price;

  if (isMockPayment()) {
    const expiresAt = new Date(Date.now() + hours * 3600_000);
    const payment = await prisma.payment.create({
      data: {
        userId, amount: price,
        status: "PAID", paidAt: new Date(),
        metadata: { kind: "LIVE", channelId, title: channel.name },
      },
    });

    await prisma.purchase.upsert({
      where:  { userId_channelId: { userId, channelId } },
      update: { status: "ACTIVE", expiresAt, amount: price },
      create: { userId, channelId, amount: price, expiresAt },
    });

    try {
      await pushNotification({
        userId, type: "CONTENT",
        title: `${channel.name} худалдан авагдлаа`,
        body:  `${hours} цагийн дотор үзэх боломжтой.`,
        link:  `/live`,
      });
    } catch { /* silent */ }

    return {
      mock: true, paid: true,
      paymentId: payment.id, invoiceId: payment.invoiceId, amount: price,
    };
  }

  const payment = await prisma.payment.create({
    data: {
      userId, amount: price,
      metadata: { kind: "LIVE", channelId, title: channel.name },
    },
  });

  const invoice = await qpay.createInvoice({
    invoiceId:   payment.invoiceId,
    amount:      price,
    description: `МҮОНРТ LIVE: ${channel.name}`,
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
