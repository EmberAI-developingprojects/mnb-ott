import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  passwordChangeLimiter,
} from "../middleware/rate-limit.middleware";
import * as ctrl from "../controllers/auth.controller";

export const authRouter = Router();

// Бүртгэх (2 алхам) — OTP илгээх дээр rate limit, verify дээр илүү уян
authRouter.post("/register",        otpSendLimiter,   ctrl.registerInit);
authRouter.post("/register/verify", otpVerifyLimiter, ctrl.registerVerify);
authRouter.post("/login",           loginLimiter,     ctrl.login);
authRouter.post("/google",          ctrl.googleAuth);
authRouter.get("/google/url",       ctrl.googleAuthUrl);
authRouter.get("/google/callback",  ctrl.googleCallback);

// Нууц үг сэргээх
authRouter.post("/forgot-password",        otpSendLimiter,   ctrl.forgotPassword);
authRouter.post("/verify-reset-otp",       otpVerifyLimiter, ctrl.verifyResetOtp);
authRouter.post("/reset-password",         otpVerifyLimiter, ctrl.resetPassword);

// OTP (утас)
authRouter.post("/send-otp",        otpSendLimiter,   ctrl.sendOtp);
authRouter.post("/verify-otp",      otpVerifyLimiter, ctrl.verifyOtp);

// Profile
authRouter.patch("/profile",         requireAuth, ctrl.updateProfile);
authRouter.post("/change-password",  requireAuth, passwordChangeLimiter, ctrl.changePassword);

// Sessions (devices)
authRouter.get("/sessions",             requireAuth, ctrl.getSessions);
authRouter.delete("/sessions/:id",      requireAuth, ctrl.removeSession);

// Session
authRouter.post("/refresh",         ctrl.refresh);
authRouter.post("/logout",  requireAuth, ctrl.logout);
authRouter.get("/me",       requireAuth, ctrl.me);

// Account deletion — Cascade-аар хамаатай бүх record устгана
authRouter.delete("/account", requireAuth, ctrl.deleteAccount);
