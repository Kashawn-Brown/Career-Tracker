import type { AuthUser, UserPlan } from "@/types/api";
import { AI_FREE_QUOTA } from "./constants";

// Re-export so consumers only need one import
export { AI_FREE_QUOTA };

/**
 * Returns the user's effective plan.
 * ADMIN role always maps to PRO_PLUS regardless of stored plan.
 */
export function getEffectivePlan(user: Pick<AuthUser, "role" | "plan">): UserPlan {
  if (user.role === "ADMIN") return "PRO_PLUS";
  return user.plan;
}

/**
 * Returns true if the user has the ADMIN role.
 */
export function isAdminUser(user: Pick<AuthUser, "role">): boolean {
  return user.role === "ADMIN";
}

/**
 * Returns true if the plan includes unlimited AI access (PRO or higher).
 */
export function hasProPlan(plan: UserPlan): boolean {
  return plan === "PRO" || plan === "PRO_PLUS";
}

/**
 * @deprecated Phase 10: use resolveUsageState() from entitlement-policy (backend)
 * or analyticsApi.getMyUsage() (frontend) for real credit enforcement.
 * Kept for legacy test compatibility only.
 */
export function canUseAi(user: Pick<AuthUser, "role" | "plan" | "aiFreeUsesUsed">): boolean {
  const plan = getEffectivePlan(user);
  if (hasProPlan(plan)) return true;
  return (user.aiFreeUsesUsed ?? 0) < AI_FREE_QUOTA;
}

/**
 * @deprecated Phase 10: use UsageState.remaining from analyticsApi.getMyUsage() instead.
 */
export function getRemainingAiCredits(
  user: Pick<AuthUser, "role" | "plan" | "aiFreeUsesUsed">
): number | null {
  const plan = getEffectivePlan(user);
  if (hasProPlan(plan)) return null;
  return Math.max(0, AI_FREE_QUOTA - (user.aiFreeUsesUsed ?? 0));
}

/**
 * Returns a display label for the user's effective plan.
 */
export function getPlanBadgeLabel(user: Pick<AuthUser, "role" | "plan">): string {
  const plan = getEffectivePlan(user);
  switch (plan) {
    case "PRO_PLUS": return "Pro+";
    case "PRO":      return "Pro";
    default:         return "";
  }
}