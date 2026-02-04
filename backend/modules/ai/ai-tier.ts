import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * AI tier is used to choose model + cost/quality settings.
 *
 * - regular: default users
 * - pro: aiProEnabled users
 * - admin: isAdmin users (always highest tier)
 */
export type AiTier = "regular" | "pro" | "admin";

/**
 * Resolve the user's AI tier from the database.
 *
 * - Resolve tier once per request
 * - Centralizes the logic (admin overrides pro)
 */
export async function resolveAiTierForUser(
  userId: string,
  db: DbClient = prisma
): Promise<AiTier> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, aiProEnabled: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  if (user.isAdmin) return "admin";
  if (user.aiProEnabled) return "pro";
  return "regular";
}
