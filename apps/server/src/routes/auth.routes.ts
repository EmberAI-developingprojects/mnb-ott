import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as ctrl from "../controllers/auth.controller";

export const authRouter = Router();

// Бүртгэх (2 алхам)
authRouter.post("/register",        ctrl.registerInit);
authRouter.post("/register/verify", ctrl.registerVerify);
authRouter.post("/login",           ctrl.login);
authRouter.post("/google",          ctrl.googleAuth);
authRouter.get("/google/url",       ctrl.googleAuthUrl);
authRouter.get("/google/callback",  ctrl.googleCallback);

// Нууц үг сэргээх
authRouter.post("/forgot-password", ctrl.forgotPassword);
authRouter.post("/reset-password",  ctrl.resetPassword);

// OTP (утас)
authRouter.post("/send-otp",        ctrl.sendOtp);
authRouter.post("/verify-otp",      ctrl.verifyOtp);

// Profile
authRouter.patch("/profile",         requireAuth, ctrl.updateProfile);
authRouter.post("/change-password",  requireAuth, ctrl.changePassword);

// Sessions (devices)
authRouter.get("/sessions",             requireAuth, ctrl.getSessions);
authRouter.delete("/sessions/:id",      requireAuth, ctrl.removeSession);

// Session
authRouter.post("/refresh",         ctrl.refresh);
authRouter.post("/logout",  requireAuth, ctrl.logout);
authRouter.get("/me",       requireAuth, ctrl.me);

// Account deletion — Cascade-аар хамаатай бүх record устгана
authRouter.delete("/account", requireAuth, ctrl.deleteAccount);
