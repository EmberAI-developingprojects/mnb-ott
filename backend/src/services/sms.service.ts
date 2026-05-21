import axios from "axios";

export async function sendSms(phone: string, message: string): Promise<void> {
  if (process.env.SMS_MOCK === "true") {
    console.log(`[SMS MOCK] → ${phone}: ${message}`);
    return;
  }

  await axios.post(
    process.env.SMS_GATEWAY_URL!,
    { phone, message, sender: process.env.SMS_SENDER_ID },
    { headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}` } }
  );
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
