import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { resolvePlanForUser, hasUnlimitedAiAccess } from "../plans/plan-resolver.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const AI_FREE_QUOTA = 5;

/**
 * Guard: blocks AI calls when the user has no remaining access.
 *
 * - PRO / PRO_PLUS (including admins): always allowed
 * - REGULAR: allowed while aiFreeUsesUsed < AI_FREE_QUOTA
 */
export async function assertAiAccessOrThrow(userId: string, db: DbClient = prisma) {

  // Find the user by ID
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true, aiFreeUsesUsed: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  // Get the plan for the user
  const effectivePlan = resolvePlanForUser(user);

  if (hasUnlimitedAiAccess(effectivePlan)) return;

  // If the user is a REGULAR user, enforce the free quota
  const used = user.aiFreeUsesUsed ?? 0;
  if (used < AI_FREE_QUOTA) return;

  throw new AppError("AI quota exceeded", 403, "AI_QUOTA_EXCEEDED");
}

/**
 * Consume one free AI credit after a successful run.
 *
 * - PRO / PRO_PLUS: no-op
 * - REGULAR: increment counter if still under quota
 * - Quota already exhausted: throw AI_QUOTA_EXCEEDED
 */
export async function consumeAiFreeUseOnSuccessOrThrow(
  userId: string,
  db: DbClient = prisma
) {
  // Only increment for REGULAR users who are still under quota
  const updated = await db.user.updateMany({
    where: {
      id: userId,
      // Only REGULAR users consume credits (role=USER, plan=REGULAR)
      role: "USER",
      plan: "REGULAR",
      aiFreeUsesUsed: { lt: AI_FREE_QUOTA },
    },
    data: { aiFreeUsesUsed: { increment: 1 } },
  });

  if (updated.count === 1) return;

  // count === 0: either paid plan (no-op) or quota exhausted — check which
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const effectivePlan = resolvePlanForUser(user);
  if (hasUnlimitedAiAccess(effectivePlan)) return; // paid plan, no-op

  throw new AppError("AI quota exceeded", 403, "AI_QUOTA_EXCEEDED");
}