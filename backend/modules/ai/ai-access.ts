import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const AI_FREE_QUOTA = 5;

/**
 * Guard: blocks AI calls when user is not Pro and has exhausted free quota.
 * (Email verification is handled separately by requireVerifiedEmail.)
 */
export async function assertAiAccessOrThrow(userId: string, db: DbClient = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { aiProEnabled: true, aiFreeUsesUsed: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  if (user.aiProEnabled) return;

  const used = user.aiFreeUsesUsed ?? 0;
  if (used < AI_FREE_QUOTA) return;

  throw new AppError("AI quota exceeded", 403, "AI_QUOTA_EXCEEDED");
}

/**
 * Consume a free AI credit AFTER a successful AI run.
 * - Pro users: no-op
 * - Non-pro users: increment only if still under quota
 * - If quota is exhausted by the time we consume: throw AI_QUOTA_EXCEEDED
 */
export async function consumeAiFreeUseOnSuccessOrThrow(userId: string, db: DbClient = prisma) {
  const updated = await db.user.updateMany({
    where: {
      id: userId,
      aiProEnabled: false,
      aiFreeUsesUsed: { lt: AI_FREE_QUOTA },
    },
    data: { aiFreeUsesUsed: { increment: 1 } },
  });

  if (updated.count === 1) return;

  // count === 0 could mean: Pro user, quota exceeded, or user missing
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { aiProEnabled: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  if (user.aiProEnabled) return;

  throw new AppError("AI quota exceeded", 403, "AI_QUOTA_EXCEEDED");
}
