import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/* Prisma log policy:
   - production       : "error" л — disk + I/O хэмнэнэ
   - dev (default)    : "warn" + "error" — query spam байхгүй, гэхдээ
                        потенциалын асуудал warn-ээр харагдана
   - DEBUG_PRISMA=1   : "query" нэмнэ — бүх SQL гаргана (зөвхөн debugging үед)
   tsx watch reload бүрд PrismaClient дахин үүсэхгүй (HMR-safe) — global cache. */
const enableQueryLog = process.env.DEBUG_PRISMA === "1";

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "production"
    ? ["error"]
    : enableQueryLog ? ["query", "warn", "error"] : ["warn", "error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
