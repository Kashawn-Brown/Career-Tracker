/**
 * entitlement-policy.ts
 *
 * Central policy module for Phase 10 plan entitlements.
 *
 * This is the single source of truth for:
 *   - monthly credit allowances by plan
 *   - tool-family credit costs
 *   - effort/verbosity execution profiles by plan
 *   - current cycle usage state (remaining, threshold, blocked)
 *   - credit consumption on successful runs
 *
 * All AI flows should go through this module for access checks and
 * credit consumption. Never scatter entitlement logic across routes.
 */

import { UserPlan }  from "@prisma/client";
import { prisma }    from "../../lib/prisma.js";
import { AppError }  from "../../errors/app-error.js";
import { resolvePlanForUser } from "./plan-resolver.js";

// ─── Plan allowances ──────────────────────────────────────────────────────────

/**
 * Monthly credit allowance by plan.
 * PRO+ is internal/testing — very high allowance, not user-facing.
 */
export const MONTHLY_CREDITS: Record<UserPlan, number> = {
  [UserPlan.REGULAR]:  100,
  [UserPlan.PRO]:      1200,
  [UserPlan.PRO_PLUS]: 999_999, // effectively unlimited for internal use
};


// ─── Tool-family credit costs ─────────────────────────────────────────────────

/**
 * Tool families map related AI tools to a single credit cost.
 * Generic and targeted versions of the same family share the same weight.
 */
export type AiToolFamily =
  | "JD_EXTRACTION"
  | "FIT"
  | "RESUME"
  | "COVER_LETTER"
  | "INTERVIEW_PREP";

export const TOOL_CREDIT_COST: Record<AiToolFamily, number> = {
  JD_EXTRACTION:  1,
  FIT:            2,
  RESUME:         2,
  COVER_LETTER:   3,
  INTERVIEW_PREP: 3,
};

/**
 * Maps AiRun toolKind strings to their tool family for credit cost resolution.
 * Keeps the credit system decoupled from the exact string values used in AiRun.
 */
export function resolveToolFamily(toolKind: string): AiToolFamily {
  switch (toolKind) {
    case "JD_EXTRACTION":                 return "JD_EXTRACTION";
    case "FIT":                           return "FIT";
    case "RESUME_HELP":
    case "RESUME_ADVICE":                 return "RESUME";
    case "COVER_LETTER_HELP":
    case "COVER_LETTER":                  return "COVER_LETTER";
    case "INTERVIEW_PREP":                return "INTERVIEW_PREP";
    default:                              return "INTERVIEW_PREP"; // safe fallback — highest cost
  }
}

export function creditCostForTool(toolKind: string): number {
  return TOOL_CREDIT_COST[resolveToolFamily(toolKind)];
}


// ─── Execution profiles ───────────────────────────────────────────────────────

export type EffortLevel     = "low" | "medium";
export type VerbosityLevel  = "low" | "medium";

export type ExecutionProfile = {
  effort:    EffortLevel;
  verbosity: VerbosityLevel;
};

/**
 * Plan-aware execution profile for judgment-heavy AI tools.
 * JD extraction always uses a fixed stable config — do not route it here.
 *
 * REGULAR → low effort/verbosity  (faster, leaner output)
 * PRO / PRO+ → medium             (richer, more thorough output)
 */
export function getExecutionProfile(plan: UserPlan): ExecutionProfile {
  switch (plan) {
    case UserPlan.PRO:
    case UserPlan.PRO_PLUS:
      return { effort: "medium", verbosity: "medium" };
    case UserPlan.REGULAR:
    default:
      return { effort: "low", verbosity: "low" };
  }
}


// ─── Warning thresholds ───────────────────────────────────────────────────────

export type UsageThreshold = "OK" | "WARNING_75" | "WARNING_90" | "BLOCKED";

export function computeThreshold(used: number, total: number): UsageThreshold {
  if (total <= 0) return "BLOCKED";
  const pct = used / total;
  if (pct >= 1)    return "BLOCKED";
  if (pct >= 0.90) return "WARNING_90";
  if (pct >= 0.75) return "WARNING_75";
  return "OK";
}


// ─── Cycle helpers ────────────────────────────────────────────────────────────

export function currentCycleKey(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/**
 * Returns the UTC date of the first day of the next month.
 * Used to show users when their credits will reset.
 */
export function nextCycleResetDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}


// ─── Usage state ──────────────────────────────────────────────────────────────

export type UsageState = {
  plan:          UserPlan;
  baseCredits:   number;
  bonusCredits:  number;
  totalCredits:  number;
  usedCredits:   number;
  remaining:     number;
  percentUsed:   number;
  threshold:     UsageThreshold;
  isBlocked:     boolean;
  resetAt:       Date;
};

/**
 * Resolves the current usage state for a user.
 * Creates the cycle row if it does not exist yet (lazy initialization).
 * Never throws for missing data — returns a safe default state.
 */
export async function resolveUsageState(userId: string): Promise<UsageState> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, plan: true },
  });

  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const effectivePlan = resolvePlanForUser(user);
  const { year, month } = currentCycleKey();
  const baseCredits = MONTHLY_CREDITS[effectivePlan];

  // Upsert the cycle row — creates it on first access for the month
  const cycle = await prisma.planUsageCycle.upsert({
    where:  { userId_cycleYear_cycleMonth: { userId, cycleYear: year, cycleMonth: month } },
    create: {
      userId,
      cycleYear:        year,
      cycleMonth:       month,
      baseCredits,
      bonusCredits:     0,
      usedCredits:      0,
      planAtCycleStart: effectivePlan,
    },
    update: {},  // don't overwrite existing data on subsequent reads
    select: {
      baseCredits:  true,
      bonusCredits: true,
      usedCredits:  true,
    },
  });

  const totalCredits = cycle.baseCredits + cycle.bonusCredits;
  const usedCredits  = cycle.usedCredits;
  const remaining    = Math.max(0, totalCredits - usedCredits);
  const percentUsed  = totalCredits > 0 ? usedCredits / totalCredits : 1;
  const threshold    = computeThreshold(usedCredits, totalCredits);

  return {
    plan:         effectivePlan,
    baseCredits:  cycle.baseCredits,
    bonusCredits: cycle.bonusCredits,
    totalCredits,
    usedCredits,
    remaining,
    percentUsed:  Math.round(percentUsed * 100),
    threshold,
    isBlocked:    threshold === "BLOCKED",
    resetAt:      nextCycleResetDate(),
  };
}


// ─── Access guard ─────────────────────────────────────────────────────────────

/**
 * Throws AI_QUOTA_EXCEEDED if the user is blocked for the current cycle.
 * Call this BEFORE starting any AI execution.
 */
export async function assertCreditAccessOrThrow(userId: string): Promise<void> {
  const state = await resolveUsageState(userId);
  if (state.isBlocked) {
    throw new AppError(
      "Monthly AI credit limit reached. Request more credits or upgrade your plan.",
      403,
      "AI_QUOTA_EXCEEDED"
    );
  }
}


// ─── Credit consumption ───────────────────────────────────────────────────────

/**
 * Consumes credits for a successful AI run.
 * Only increments if the user is on a plan with a real allowance.
 * PRO+ is given a very high allowance so it flows through the same path.
 *
 * Call this AFTER a successful AI completion — never on failure.
 */
export async function consumeCreditsOnSuccess(
  userId:   string,
  toolKind: string,
): Promise<void> {
  const cost = creditCostForTool(toolKind);
  const { year, month } = currentCycleKey();

  // Increment usedCredits. If the cycle row doesn't exist yet, create it first.
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, plan: true },
  });
  if (!user) return;

  const effectivePlan = resolvePlanForUser(user);
  const baseCredits   = MONTHLY_CREDITS[effectivePlan];

  await prisma.planUsageCycle.upsert({
    where: { userId_cycleYear_cycleMonth: { userId, cycleYear: year, cycleMonth: month } },
    create: {
      userId,
      cycleYear:        year,
      cycleMonth:       month,
      baseCredits,
      bonusCredits:     0,
      usedCredits:      cost,
      planAtCycleStart: effectivePlan,
    },
    update: {
      usedCredits: { increment: cost },
    },
  });
}


// ─── Admin actions ────────────────────────────────────────────────────────────

/**
 * Adds bonus credits to a user's current cycle.
 * Records the action in PlanUsageAdjustment for audit.
 */
export async function adminAddCredits(
  userId:      string,
  credits:     number,
  adminUserId: string,
  note?:       string,
): Promise<void> {
  const { year, month } = currentCycleKey();

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, plan: true },
  });
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const effectivePlan = resolvePlanForUser(user);
  const baseCredits   = MONTHLY_CREDITS[effectivePlan];

  await prisma.$transaction([
    prisma.planUsageCycle.upsert({
      where:  { userId_cycleYear_cycleMonth: { userId, cycleYear: year, cycleMonth: month } },
      create: {
        userId,
        cycleYear:        year,
        cycleMonth:       month,
        baseCredits,
        bonusCredits:     credits,
        usedCredits:      0,
        planAtCycleStart: effectivePlan,
      },
      update: { bonusCredits: { increment: credits } },
    }),
    prisma.planUsageAdjustment.create({
      data: {
        userId,
        cycleYear:      year,
        cycleMonth:     month,
        adjustmentType: "ADD_CREDITS",
        creditsAdded:   credits,
        adminUserId,
        note,
      },
    }),
  ]);
}

/**
 * Resets a user's current cycle to their plan's base allowance.
 * Clears usedCredits and bonusCredits. Records the action in audit log.
 */
export async function adminResetCycle(
  userId:      string,
  adminUserId: string,
  note?:       string,
): Promise<void> {
  const { year, month } = currentCycleKey();

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, plan: true },
  });
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const effectivePlan = resolvePlanForUser(user);
  const baseCredits   = MONTHLY_CREDITS[effectivePlan];

  await prisma.$transaction([
    prisma.planUsageCycle.upsert({
      where:  { userId_cycleYear_cycleMonth: { userId, cycleYear: year, cycleMonth: month } },
      create: {
        userId,
        cycleYear:        year,
        cycleMonth:       month,
        baseCredits,
        bonusCredits:     0,
        usedCredits:      0,
        planAtCycleStart: effectivePlan,
      },
      update: {
        baseCredits,
        bonusCredits: 0,
        usedCredits:  0,
      },
    }),
    prisma.planUsageAdjustment.create({
      data: {
        userId,
        cycleYear:      year,
        cycleMonth:     month,
        adjustmentType: "RESET_CYCLE",
        creditsAdded:   0,
        adminUserId,
        note,
      },
    }),
  ]);
}