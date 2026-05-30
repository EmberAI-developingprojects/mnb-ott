import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware";
import type { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  role: Role;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new AppError("Нэвтрэх шаардлагатай", 401, "UNAUTHORIZED");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError("Token хүчингүй", 401, "INVALID_TOKEN");
  }
}

/* Optional auth — token байвал req.user-д тавина, байхгүй/хүчингүй бол алгасна
   (throw хийхгүй). Public endpoint дээр "нэвтэрсэн бол нэмэлт мэдээлэл" буцаахад
   ашиглана. Жишээ: /api/channels — нэвтрээгүй ч browse, нэвтэрсэн бол streamUrl. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    } catch { /* хүчингүй token — зочин гэж үзнэ */ }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError("Нэвтрэх шаардлагатай", 401, "UNAUTHORIZED");
    if (!roles.includes(req.user.role)) {
      throw new AppError("Эрх хүрэлцэхгүй", 403, "FORBIDDEN");
    }
    next();
  };
}
