import { PrismaClient } from "@prisma/client";

// Prevent creating too many DB connections in dev reloads (nodemon/tsx).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };  // prevents multiple connections when the server restarts often in dev

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
// PrismaClient manages DB connections + queries