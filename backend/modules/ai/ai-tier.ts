import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { resolvePlanForUser, type EffectivePlan } from "../plan/plan-resolver.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

// Re-export EffectivePlan as AiTier for use in ai.dto.ts and ai.service.ts
export type AiTier = EffectivePlan;

/**
 * Resolve the AI tier (effective plan) for a user by ID.
 */
export async function resolveAiTierForUser(
  userId: string,
  db: DbClient = prisma
): Promise<AiTier> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  return resolvePlanForUser(user);
}