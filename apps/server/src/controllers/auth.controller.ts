import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { prisma } from "../lib/prisma";

/* Production-д client (Vercel) болон server (Render) өөр domain дээр суудаг тул
   refresh cookie cross-site явах ёстой → sameSite "none" + secure заавал.
   Local dev (http) дээр "none" ажиллахгүй тул "lax" руу автоматаар буцна. */
const CROSS_SITE = process.env.NODE_ENV === "production";
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   CROSS_SITE,
  sameSite: (CROSS_SITE ? "none" : "lax") as "none" | "lax",
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
  path:     "/",
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, COOKIE_OPTS);
}

const DEVICE = (req: Request) => ({
  deviceId:   (req.body.deviceId   as string | undefined) ?? "web",
  deviceName: (req.body.deviceName as string | undefined) ?? "Web Browser",
  deviceType: (req.body.deviceType as string | undefined) ?? "web",
  /* Cloudflare/Render-ийн ард байх үед үнэн IP-г X-Forwarded-For эхний оруулдаг.
     trust proxy идэвхтэй тул req.ip аль хэдийн зөв унших ёстой. */
  ip: req.ip,
});

// ── Register step 1: мэдээлэл + OTP явуулах ──────────

export async function registerInit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      name:         z.string().min(2, "Нэр хэт богино байна"),
      emailOrPhone: z.string().min(1, "Утас эсвэл email шаардлагатай"),
      password:     z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байна"),
    }).parse(req.body);
    const result = await authService.registerInit(body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

// ── Register step 2: OTP баталгаажуулах + token авах ─

export async function registerVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrPhone, otp } = z.object({
      emailOrPhone: z.string().min(1),
      otp:          z.string().length(6),
    }).parse(req.body);
    const tokens = await authService.registerVerify(emailOrPhone, otp, DEVICE(req));
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (e) { next(e); }
}

// ── Login with password ───────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrPhone, password } = z.object({
      emailOrPhone: z.string().min(1),
      password:     z.string().min(1),
    }).parse(req.body);
    const tokens = await authService.loginWithPassword(emailOrPhone, password, DEVICE(req));
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (e) { next(e); }
}

// ── Forgot password ───────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrPhone } = z.object({ emailOrPhone: z.string().min(1) }).parse(req.body);
    await authService.forgotPassword(emailOrPhone);
    res.json({ success: true, data: { message: "Код илгээлээ" } });
  } catch (e) { next(e); }
}

// ── Reset password ────────────────────────────────────

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrPhone, otp, newPassword } = z.object({
      emailOrPhone: z.string().min(1),
      otp:          z.string().length(6),
      newPassword:  z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байна"),
    }).parse(req.body);
    await authService.resetPassword(emailOrPhone, otp, newPassword);
    res.json({ success: true, data: { message: "Нууц үг шинэчлэгдлээ" } });
  } catch (e) { next(e); }
}

/* OTP-only validation — UX: forgot-password flow дотор хэрэглэгч "code" алхамд
   буруу OTP оруулсныг шууд мэдэхэд тус болно. Password шинэчлэхгүй. */
export async function verifyResetOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrPhone, otp } = z.object({
      emailOrPhone: z.string().min(1),
      otp:          z.string().length(6),
    }).parse(req.body);
    await authService.verifyResetOtp(emailOrPhone, otp);
    res.json({ success: true, data: { valid: true } });
  } catch (e) { next(e); }
}

// ── OTP (phone only) ──────────────────────────────────

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = z.object({ phone: z.string().regex(/^(\+976|976)?[0-9]{8}$/) }).parse(req.body);
    await authService.sendOtp(phone);
    res.json({ success: true, data: { message: "OTP илгээлээ" } });
  } catch (e) { next(e); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, code } = z.object({ phone: z.string(), code: z.string().length(6) }).parse(req.body);
    const tokens = await authService.verifyOtp(phone, code, DEVICE(req));
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (e) { next(e); }
}

// ── Google OAuth — redirect flow ─────────────────────

export async function googleAuthUrl(req: Request, res: Response) {
  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri  = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/auth/google/callback`;
  const state        = Buffer.from(JSON.stringify({
    callbackUrl: (req.query.callbackUrl as string) ?? "/",
    deviceId:    (req.query.deviceId   as string) ?? "web",
  })).toString("base64url");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "openid email profile",
    state,
    access_type:   "online",
    prompt:        "select_account",
  });

  res.json({ success: true, data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } });
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state, error } = req.query as Record<string, string>;
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    if (error) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/auth/google/callback`;
    const stateData   = JSON.parse(Buffer.from(state, "base64url").toString());

    // code → access_token солих
    const tokenRes = await (await import("axios")).default.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const idToken = tokenRes.data.id_token;
    const tokens  = await authService.googleAuth(idToken, {
      deviceId:   stateData.deviceId ?? "web",
      deviceName: "Web Browser",
      deviceType: "web",
    });

    // refreshToken cookie-д хадгална, accessToken-г URL-аар дамжуулна
    setRefreshCookie(res, tokens.refreshToken);
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      callbackUrl: stateData.callbackUrl ?? "/",
    });
    res.redirect(`${frontendUrl}/auth/callback?${params}`);
  } catch (e) { next(e); }
}

// ── Google OAuth — ID token (GSI) ─────────────────────

export async function googleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);
    const tokens = await authService.googleAuth(idToken, DEVICE(req));
    res.json({ success: true, data: tokens });
  } catch (e) { next(e); }
}

// ── Profile update ────────────────────────────────────

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId }, data: { name }, include: { subscription: true },
    });
    const { password, ...safe } = user;
    res.json({ success: true, data: { ...safe, hasPassword: !!password } });
  } catch (e) { next(e); }
}

// ── Change password ────────────────────────────────────

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    }).parse(req.body);
    const bcrypt = await import("bcryptjs");
    const { AppError } = await import("../middleware/error.middleware");

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.password) throw new AppError("Нууц үг тохируулаагүй байна", 400, "NO_PASSWORD");

    const valid = await bcrypt.default.compare(currentPassword, user.password);
    if (!valid) throw new AppError("Одоогийн нууц үг буруу байна", 400, "INVALID_PASSWORD");

    const hashed = await bcrypt.default.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ success: true, data: { changed: true } });
  } catch (e) { next(e); }
}

// ── Sessions ──────────────────────────────────────────

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await prisma.userSession.findMany({
      where:   { userId: req.user!.userId, isActive: true },
      orderBy: { lastActive: "desc" },
      select:  {
        id: true, deviceName: true, deviceType: true, ip: true,
        lastActive: true, createdAt: true,
      },
    });
    /* Одоогийн session-ийг JWT-аас уншсан sessionId-аар тэмдэглэнэ. Frontend
       "Энэ төхөөрөмж" badge харуулах + энэ session-ийг устгахад logout flow
       trigger хийнэ. */
    const currentSessionId = req.user!.sessionId;
    const data = sessions.map((s) => ({ ...s, isCurrent: s.id === currentSessionId }));
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function removeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const isCurrent = req.params.id === req.user!.sessionId;
    await prisma.userSession.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data:  { isActive: false },
    });
    /* Хэрэглэгч өөрийн идэвхтэй session-ийг устгаж байгаа бол frontend-д logout
       flag буцаана — clearAuth + redirect хийнэ. Refresh cookie ч цэвэрлэнэ. */
    if (isCurrent) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path:     "/",
      });
    }
    res.json({ success: true, data: { removed: true, isCurrent } });
  } catch (e) { next(e); }
}

// ── Refresh / Logout / Me ─────────────────────────────

export async function refresh(req: Request, res: Response, _next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      res.status(401).json({ success: false, message: "Refresh token байхгүй", code: "NO_REFRESH_TOKEN" });
      return;
    }
    const tokens = await authService.refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (e) {
    const code = e instanceof Error && "code" in e ? (e as { code?: string }).code : "REFRESH_FAILED";
    res.status(401).json({
      success: false,
      message: "Дахин нэвтэрнэ үү",
      code:    code ?? "REFRESH_FAILED",
    });
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try { await authService.logout(req.user!.sessionId); res.json({ success: true, data: { message: "Гарлаа" } }); }
  catch (e) { next(e); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try { const user = await authService.getMe(req.user!.userId); res.json({ success: true, data: user }); }
  catch (e) { next(e); }
}


export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { confirm } = z.object({ confirm: z.literal("DELETE") }).parse(req.body);
    void confirm;
    await prisma.user.delete({ where: { id: req.user!.userId } });
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}
