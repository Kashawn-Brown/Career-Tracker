import { UserRole, UserPlan, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * The effective plan a user operates under.
 * Admins always get PRO_PLUS regardless of their stored plan.
 */
export type EffectivePlan = UserPlan;

/**
 * Resolve the effective plan for a user object already in memory.
 * Rule: ADMIN role always maps to PRO_PLUS.
 */
export function resolvePlanForUser(user: {
  role: UserRole;
  plan: UserPlan;
}): EffectivePlan {
  if (user.role === UserRole.ADMIN) return UserPlan.PRO_PLUS;
  return user.plan;
}

/**
 * Resolve the effective plan for a user by ID (hits the DB).
 * Use this in routes/services when you only have a userId.
 */
export async function resolvePlanForUserId(
  userId: string,
  db: DbClient = prisma
): Promise<EffectivePlan> {
  
    const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  return resolvePlanForUser(user);
}

/**
 * Returns true if the user has the ADMIN role.
 */
export function isAdminRole(user: { role: UserRole }): boolean {
  return user.role === UserRole.ADMIN;
}

/**
 * Returns true if the plan includes unlimited AI access (PRO or higher).
 */
export function hasUnlimitedAiAccess(plan: EffectivePlan): boolean {
  return plan === UserPlan.PRO || plan === UserPlan.PRO_PLUS;
}