import nodemailer, { type Transporter } from "nodemailer";

/* SMTP_* env-ийг lazy байдлаар ачаалж, нэг л transporter дахин ашиглана.
   EMAIL_MOCK=true үед, эсвэл SMTP_HOST/USER/PASS дутуу үед console.log-р fallback. */

let cached: Transporter | null = null;

function isMock(): boolean {
  if (process.env.EMAIL_MOCK === "true") return true;
  return !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS;
}

function getTransporter(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cached;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (isMock()) {
    console.log(`[EMAIL MOCK] → ${opts.to} :: ${opts.subject}\n${opts.text ?? opts.html}`);
    return;
  }
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/* Брэндлэгдсэн OTP имэйл — purpose: "register" | "reset" | "login" */
export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "register" | "reset" | "login",
): Promise<void> {
  const title =
    purpose === "register" ? "Бүртгэлийн баталгаажуулах код"
    : purpose === "reset"  ? "Нууц үг сэргээх код"
    :                         "Нэвтрэх код";

  const subject = `МҮОНРТ OTT — ${title}`;
  const text =
    `${title}: ${code}\n\nКодын хүчинтэй хугацаа: 10 минут.\nХэрэв та энэ үйлдлийг хийгээгүй бол энэ имэйлийг үл тоомсорлоно уу.`;

  const html = `
<!DOCTYPE html>
<html lang="mn">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4ef;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.5px;">
            <span style="color:#CF1E28;">M</span><span style="color:#0046A5;">N</span><span style="color:#CF1E28;">B</span>
            <span style="color:#666;font-size:13px;font-weight:600;margin-left:6px;">OTT</span>
          </div>
        </td></tr>
        <tr><td style="padding:8px 28px 4px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#111;">${title}</h1>
        </td></tr>
        <tr><td style="padding:6px 28px 18px;">
          <p style="margin:0;font-size:14px;line-height:1.5;color:#555;">
            Та доорх 6 оронтой кодыг МҮОНРТ OTT-н холбогдох талбарт оруулна уу.
          </p>
        </td></tr>
        <tr><td style="padding:0 28px 22px;" align="center">
          <div style="display:inline-block;padding:14px 28px;background:#0046A5;color:#ffffff;font-size:30px;font-weight:800;letter-spacing:10px;border-radius:10px;font-family:'SF Mono',Menlo,monospace;">
            ${code}
          </div>
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <p style="margin:0;font-size:12.5px;line-height:1.5;color:#888;">
            Кодын хүчинтэй хугацаа <strong>10 минут</strong>.
            Хэрэв та энэ үйлдлийг хийгээгүй бол имэйлийг үл тоомсорлоно уу — таны бүртгэлд өөрчлөлт орохгүй.
          </p>
        </td></tr>
        <tr><td style="padding:14px 28px;background:#f7f7f4;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;">
            © ${new Date().getFullYear()} МҮОНРТ OTT — Монголын Үндэсний Олон Нийтийн Радио Телевиз
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  await sendEmail({ to, subject, html, text });
}
