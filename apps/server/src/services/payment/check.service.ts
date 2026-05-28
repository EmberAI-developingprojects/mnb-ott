import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import * as qpay from "../qpay.service";
import { handlePaymentSuccess } from "./success.service";

/* Hand-polling — frontend QR scan хийсний дараа /check call хийж байгаа эсэхийг шалгана.
   Хэрэв payment мөн QPay-д PAID байгаа бол DB-д ч PAID болгож handlePaymentSuccess дуудна. */
export async function checkPaymentStatus(userId: string, invoiceId: string) {
  const payment = await prisma.payment.findUnique({ where: { invoiceId } });
  if (!payment || payment.userId !== userId) {
    throw new AppError("Invoice олдсонгүй", 404, "NOT_FOUND");
  }
  if (payment.status === "PAID") {
    return { paid: true, status: "PAID" as const };
  }
  if (!payment.qpayInvoiceId) {
    throw new AppError("QPay invoice ID байхгүй", 400, "BAD_REQUEST");
  }

  const paid = await qpay.checkPayment(payment.qpayInvoiceId);
  if (paid) {
    /* Idempotency: updateMany нь where status=PENDING шалгалттай — өөр request
       аль хэдийн PAID болгосон бол count=0 буцаана, success handler ажиллахгүй. */
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data:  { status: "PAID", paidAt: new Date() },
    });
    if (updated.count > 0) {
      await handlePaymentSuccess(payment);
    }
  }
  return { paid, status: paid ? "PAID" as const : "PENDING" as const };
}

/* QPay webhook — paid signal-ыг push хэлбэрээр хүлээж авна.
   verifyCallback() route түвшинд хийгдсэн байх ёстой.
   Idempotency: updateMany нь atomic conditional update — нэг л request "winner"
   болж handlePaymentSuccess-ийг дуудна, бусад нь skip. SERIALIZABLE transaction
   шаардлагагүй учир compare-and-swap үйлдэл DB level-д атом хийгдэнэ. */
export async function handleQpayCallback(qpayInvoiceId: string) {
  const payment = await prisma.payment.findFirst({ where: { qpayInvoiceId } });
  if (!payment) return;

  const updated = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: "PAID" } },
    data:  { status: "PAID", paidAt: new Date() },
  });
  /* count > 0 → бид анх өөрчилсөн (winner). Зөвхөн winner success handler дуудна
     → duplicate Purchase үүсэхгүй. */
  if (updated.count > 0) {
    await handlePaymentSuccess(payment);
  }
}
