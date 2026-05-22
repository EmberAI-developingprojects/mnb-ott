import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { sendSms, generateOtp } from "./sms.service";
import { sendOtpEmail } from "./email.service";
import { AppError } from "../middleware/error.middleware";
import type { Role } from "@prisma/client";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OTP_TTL = 10 * 60; // 10 минут
const SALT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload { userId: string; role: Role; sessionId: string; }

function signAccess(p: JwtPayload)   { return jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as jwt.SignOptions["expiresIn"] }); }
function signRefresh(p: JwtPayload)  { return jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "30d") as jwt.SignOptions["expiresIn"] }); }

async function createSession(userId: string, role: Role, device: { deviceId: string; deviceName: string; deviceType: string }): Promise<TokenPair> {
  const session = await prisma.userSession.upsert({
    where:  { userId_deviceId: { userId, deviceId: device.deviceId } },
    create: { userId, deviceId: device.deviceId, deviceName: device.deviceName, deviceType: device.deviceType, refreshToken: "pending" },
    update: { isActive: true, lastActive: new Date() },
  });
  const payload: JwtPayload = { userId, role, sessionId: session.id };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh(payload);
  await prisma.userSession.update({ where: { id: session.id }, data: { refreshToken } });
  return { accessToken, refreshToken };
}

// ── REGISTER ──────────────────────────────────────────

// Step 1: Мэдээлэл хадгалж OTP явуулна (token буцаахгүй)
export async function registerInit(data: {
  name: string;
  emailOrPhone: string;
  password: string;
}): Promise<{ phone?: string; email?: string }> {
  const isPhone = /^(\+976|976)?[0-9]{8}$/.test(data.emailOrPhone);
  const isEmail = data.emailOrPhone.includes("@");
  if (!isPhone && !isEmail) throw new AppError("Утас эсвэл email оруулна уу", 400, "INVALID_IDENTIFIER");

  const existing = await prisma.user.findFirst({
    where: isPhone ? { phone: data.emailOrPhone } : { email: data.emailOrPhone },
  });

  const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

  let user;
  if (existing) {
    // OTP-ээр урьд үүссэн (password байхгүй) → бүртгүүлж болно
    if (existing.password) {
      throw new AppError("Энэ хаяг бүртгэлтэй байна. Нэвтрэх хуудсаас нэвтэрнэ үү.", 409, "ALREADY_EXISTS");
    }
    // Password байхгүй user-ийг шинэчилнэ
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { name: data.name, password: hashed, isVerified: false },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: data.name,
        phone: isPhone ? data.emailOrPhone : undefined,
        email: isEmail ? data.emailOrPhone : undefined,
        password: hashed,
        isVerified: false,
        role: "USER",
      },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, planType: "BASIC" },
      update: {},
    });
  }

  // OTP илгээнэ — phone → SMS, email → Gmail SMTP
  const otp = generateOtp();
  await prisma.otpCode.create({ data: { userId: user.id, phone: data.emailOrPhone, code: otp, expiresAt: new Date(Date.now() + OTP_TTL * 1000) } });
  await redis.set(`otp:reg:${data.emailOrPhone}`, otp, "EX", OTP_TTL);

  if (isPhone) {
    await sendSms(data.emailOrPhone, `МҮОНРТ OTT бүртгэлийн баталгаажуулах код: ${otp}`);
  } else {
    await sendOtpEmail(data.emailOrPhone, otp, "register");
  }

  return isPhone ? { phone: data.emailOrPhone } : { email: data.emailOrPhone };
}

// Step 2: OTP баталгаажуулж token буцаана
export async function registerVerify(
  emailOrPhone: string,
  otp: string,
  device: { deviceId: string; deviceName: string; deviceType: string }
): Promise<TokenPair> {
  const cached = await redis.get(`otp:reg:${emailOrPhone}`);
  if (!cached || cached !== otp) throw new AppError("Код буруу эсвэл хугацаа дууссан", 400, "INVALID_OTP");

  const isPhone = /^(\+976|976)?[0-9]{8}$/.test(emailOrPhone);
  const user = await prisma.user.findFirst({
    where: isPhone ? { phone: emailOrPhone } : { email: emailOrPhone },
  });
  if (!user) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
  await redis.del(`otp:reg:${emailOrPhone}`);

  return createSession(user.id, user.role, device);
}

// ── LOGIN (password) ──────────────────────────────────

export async function loginWithPassword(
  emailOrPhone: string,
  password: string,
  device: { deviceId: string; deviceName: string; deviceType: string }
): Promise<TokenPair> {
  const isPhone = /^\d{8}$/.test(emailOrPhone.replace(/^(\+976|976)/, ""));
  const user = await prisma.user.findFirst({
    where: isPhone ? { phone: emailOrPhone } : { email: emailOrPhone },
  });

  if (!user) {
    throw new AppError("Бүртгэлтэй хаяг олдсонгүй", 401, "INVALID_CREDENTIALS");
  }
  if (!user.password) {
    throw new AppError("Энэ хаяг нууц үггүй бүртгэлтэй. Бүртгүүлэх хуудасруу ороод нууц үг тохируулна уу.", 401, "NO_PASSWORD");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError("Нэвтрэх мэдээлэл буруу байна", 401, "INVALID_CREDENTIALS");

  await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, planType: "BASIC" }, update: {} });
  return createSession(user.id, user.role, device);
}

// ── FORGOT PASSWORD ───────────────────────────────────

export async function forgotPassword(emailOrPhone: string): Promise<void> {
  const isPhone = /^\d{8}$/.test(emailOrPhone.replace(/^(\+976|976)/, ""));
  const user = await prisma.user.findFirst({
    where: isPhone ? { phone: emailOrPhone } : { email: emailOrPhone },
  });
  if (!user) throw new AppError("Бүртгэлгүй хаяг байна", 404, "NOT_FOUND");

  const otp = generateOtp();
  await prisma.otpCode.create({ data: { userId: user.id, phone: emailOrPhone, code: otp, expiresAt: new Date(Date.now() + OTP_TTL * 1000) } });
  await redis.set(`otp:reset:${emailOrPhone}`, otp, "EX", OTP_TTL);

  if (isPhone) {
    await sendSms(emailOrPhone, `МҮОНРТ OTT нууц үг сэргээх код: ${otp}`);
  } else {
    await sendOtpEmail(emailOrPhone, otp, "reset");
  }
}

// ── RESET PASSWORD ────────────────────────────────────

export async function resetPassword(emailOrPhone: string, otp: string, newPassword: string): Promise<void> {
  const cached = await redis.get(`otp:reset:${emailOrPhone}`);
  if (!cached || cached !== otp) throw new AppError("Код буруу эсвэл хугацаа дууссан", 400, "INVALID_OTP");

  const isPhone = /^\d{8}$/.test(emailOrPhone.replace(/^(\+976|976)/, ""));
  const user = await prisma.user.findFirst({ where: isPhone ? { phone: emailOrPhone } : { email: emailOrPhone } });
  if (!user) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  await redis.del(`otp:reset:${emailOrPhone}`);
}

// ── OTP (утас баталгаажуулах) ─────────────────────────

export async function sendOtp(phone: string): Promise<void> {
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) user = await prisma.user.create({ data: { phone, role: "USER" } });

  const otp = generateOtp();
  await prisma.otpCode.create({ data: { userId: user.id, phone, code: otp, expiresAt: new Date(Date.now() + OTP_TTL * 1000) } });
  await redis.set(`otp:${phone}`, otp, "EX", OTP_TTL);
  await sendSms(phone, `МҮОНРТ OTT нэвтрэх код: ${otp}`);
}

export async function verifyOtp(phone: string, code: string, device: { deviceId: string; deviceName: string; deviceType: string }): Promise<TokenPair> {
  const cached = await redis.get(`otp:${phone}`);
  if (!cached || cached !== code) throw new AppError("OTP буруу эсвэл хугацаа дууссан", 400, "INVALID_OTP");

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");

  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
  await prisma.otpCode.updateMany({ where: { phone, used: false }, data: { used: true } });
  await redis.del(`otp:${phone}`);
  await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, planType: "BASIC" }, update: {} });
  return createSession(user.id, user.role, device);
}

// ── GOOGLE ────────────────────────────────────────────

export async function googleAuth(idToken: string, device: { deviceId: string; deviceName: string; deviceType: string }): Promise<TokenPair> {
  const ticket  = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new AppError("Google token хүчингүй", 400, "INVALID_GOOGLE_TOKEN");

  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({ data: { email: payload.email, name: payload.name, avatar: payload.picture, isVerified: true, role: "USER" } });
    await prisma.subscription.create({ data: { userId: user.id, planType: "BASIC" } });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { name: user.name ?? payload.name, avatar: user.avatar ?? payload.picture } });
  }
  return createSession(user.id, user.role, device);
}

// ── TOKEN REFRESH ─────────────────────────────────────

export async function refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
  let decoded: JwtPayload;
  try { decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET!) as JwtPayload; }
  catch { throw new AppError("Refresh token хүчингүй", 401, "INVALID_REFRESH_TOKEN"); }

  const session = await prisma.userSession.findFirst({ where: { id: decoded.sessionId, refreshToken: oldRefreshToken, isActive: true }, include: { user: true } });
  if (!session) throw new AppError("Session олдсонгүй", 401, "SESSION_NOT_FOUND");

  const payload: JwtPayload = { userId: session.userId, role: session.user.role, sessionId: session.id };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh(payload);
  await prisma.userSession.update({ where: { id: session.id }, data: { refreshToken, lastActive: new Date() } });
  return { accessToken, refreshToken };
}

// ── LOGOUT ────────────────────────────────────────────

export async function logout(sessionId: string): Promise<void> {
  await prisma.userSession.update({ where: { id: sessionId }, data: { isActive: false } });
}

// ── ME ────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user) throw new AppError("Хэрэглэгч олдсонгүй", 404, "NOT_FOUND");
  const { password: _, ...safe } = user;
  return safe;
}
