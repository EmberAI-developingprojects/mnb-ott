import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
  }
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  /* Known business error — client-д ойлгомжтой мэдээлэл */
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code:    err.code,
    });
  }

  /* Unexpected error — log хийгээд generic 500 буцаана */
  logger.error({
    err,
    reqId:  (req as Request & { id?: string }).id,
    url:    req.url,
    method: req.method,
  }, "Unhandled error");

  /* Production-д stack trace, нарийн message client-д буцаахгүй */
  const isDev = env.NODE_ENV === "development";
  return res.status(500).json({
    success: false,
    message: isDev ? (err as Error).message : "Серверийн алдаа гарлаа",
    code:    "INTERNAL_SERVER_ERROR",
    ...(isDev && { stack: (err as Error).stack }),
  });
}
