import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per Node.js process.
 * In development Next.js hot-reloads modules, so the client is cached on
 * globalThis to avoid exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
