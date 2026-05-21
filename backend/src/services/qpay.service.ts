import axios from "axios";
import { redis } from "../lib/redis";
import { AppError } from "../middleware/error.middleware";

const BASE = process.env.QPAY_BASE_URL!;
const TOKEN_KEY = "qpay:token";

interface QPayToken { access_token: string; expires_in: number; }
interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls: { name: string; description: string; logo: string; link: string }[];
}

// Token авах (cache-тай)
async function getToken(): Promise<string> {
  const cached = await redis.get(TOKEN_KEY);
  if (cached) return cached;

  const { data } = await axios.post<QPayToken>(
    `${BASE}/auth/token`,
    {},
    {
      auth: {
        username: process.env.QPAY_USERNAME!,
        password: process.env.QPAY_PASSWORD!,
      },
    }
  );

  // 5 минут өмнө expire хийнэ (safety margin)
  const ttl = Math.max(data.expires_in - 300, 60);
  await redis.set(TOKEN_KEY, data.access_token, "EX", ttl);
  return data.access_token;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Invoice үүсгэх
export async function createInvoice(params: {
  invoiceId: string;
  amount: number;        // мөнгөн дүн (төгрөг)
  description: string;
  callbackUrl: string;
}): Promise<QPayInvoice> {
  const token = await getToken();
  const { data } = await axios.post<QPayInvoice>(
    `${BASE}/invoice`,
    {
      invoice_code: process.env.QPAY_INVOICE_CODE,
      sender_invoice_no: params.invoiceId,
      invoice_receiver_code: "terminal",
      invoice_description: params.description,
      amount: params.amount,
      callback_url: params.callbackUrl,
    },
    { headers: authHeaders(token) }
  );
  return data;
}

// Төлбөр шалгах
export async function checkPayment(qpayInvoiceId: string): Promise<boolean> {
  const token = await getToken();
  const { data } = await axios.post(
    `${BASE}/payment/check`,
    { object_type: "INVOICE", object_id: qpayInvoiceId, offset: { page_number: 1, page_limit: 1 } },
    { headers: authHeaders(token) }
  );
  return data.count > 0 && data.rows?.[0]?.payment_status === "PAID";
}

// Invoice цуцлах
export async function cancelInvoice(qpayInvoiceId: string): Promise<void> {
  const token = await getToken();
  await axios.delete(`${BASE}/invoice/${qpayInvoiceId}`, { headers: authHeaders(token) });
}

// HMAC webhook баталгаажуулах (QPay нь Basic Auth ашигладаг)
export function verifyCallback(authHeader: string): boolean {
  const expected = Buffer.from(
    `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`
  ).toString("base64");
  return authHeader === `Basic ${expected}`;
}
