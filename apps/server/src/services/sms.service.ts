import axios, { AxiosError } from "axios";
import { logger } from "../lib/logger";

/* SMS service — CallPro provider дэмжсэн. Mock горимд console.log хийнэ.
   Production-д CallPro API-руу retry + timeout-той явуулна.

   ENV:
     SMS_MOCK       — "true" бол шууд console.log (dev үед default)
     SMS_PROVIDER   — "callpro" (default). Дараа нь "twilio" г.м. нэмж болно.
     CALLPRO_API_URL    — Жишээ: https://api.callpro.mn/sms/send
     CALLPRO_API_KEY    — CallPro account-аас (Bearer эсвэл query параметр)
     CALLPRO_SENDER_ID  — Бүртгэгдсэн alphanumeric sender (Жишээ: "MNB")
*/

const RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = (attempt: number) => 2 ** attempt * 500;  /* 0.5с, 1с, 2с */
const REQUEST_TIMEOUT_MS = 10_000;

interface SmsProvider {
  send: (phone: string, message: string) => Promise<void>;
}

/* CallPro — Монголын SMS aggregator. API spec нь гэрээ ирсний дараа баталгаажна;
   одоохондоо bearer-token + JSON body хэлбэрээр бичсэн. Spec ирвэл доорх 3 параметр
   (URL, body shape, auth scheme)-ийг л солих хэрэгтэй. */
const callproProvider: SmsProvider = {
  async send(phone, message) {
    const url    = process.env.CALLPRO_API_URL;
    const apiKey = process.env.CALLPRO_API_KEY;
    const from   = process.env.CALLPRO_SENDER_ID ?? "MNB";
    if (!url || !apiKey) throw new Error("CallPro env (CALLPRO_API_URL/KEY) тохируулагдаагүй");

    await axios.post(
      url,
      { to: normalizePhone(phone), text: message, from },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
  },
};

const PROVIDERS: Record<string, SmsProvider> = {
  callpro: callproProvider,
};

/* Утсыг нэг форматад оруулна: +976XXXXXXXX. CallPro нь олон формат
   зөвшөөрнө, гэхдээ нэг формат хадгалбал лог/dedup-д хялбар. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("976")) return `+${digits}`;
  if (digits.length === 8)      return `+976${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/* Exponential backoff-той retry. Network glitch, 5xx, timeout-д л retry хийнэ.
   4xx (invalid number, blacklist) бол шууд throw — retry утгагүй. */
async function sendWithRetry(provider: SmsProvider, phone: string, message: string): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      await provider.send(phone, message);
      if (i > 0) logger.info({ phone, attempt: i + 1 }, "[sms] sent after retry");
      return;
    } catch (e) {
      lastErr = e;
      const status = e instanceof AxiosError ? e.response?.status : undefined;

      /* 4xx (client error) бол retry хийхгүй — provider даалгавар хийхгүй. */
      if (status && status >= 400 && status < 500) {
        logger.error({ phone, status, body: e instanceof AxiosError ? e.response?.data : undefined },
          "[sms] permanent failure");
        throw e;
      }

      /* Сүүлчийн оролдлого дууссан */
      if (i === RETRY_ATTEMPTS - 1) break;

      const wait = RETRY_BACKOFF_MS(i);
      logger.warn({ phone, attempt: i + 1, wait, status }, "[sms] transient error, retrying");
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  logger.error({ phone, err: lastErr }, "[sms] failed after all retries");
  throw lastErr;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (process.env.SMS_MOCK === "true") {
    console.log(`[SMS MOCK] → ${normalizePhone(phone)}: ${message}`);
    return;
  }

  const providerName = process.env.SMS_PROVIDER ?? "callpro";
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown SMS provider: ${providerName}`);

  await sendWithRetry(provider, phone, message);
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
