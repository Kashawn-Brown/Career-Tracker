/**
 * entitlements.test.ts
 *
 * Tests for Phase 10 plan entitlement system.
 *
 * Coverage:
 *   - Policy unit tests (pure functions, no DB)
 *   - Credit lifecycle (resolve, consume, block)
 *   - Admin credit actions (add, reset)
 *   - HTTP enforcement (blocked users rejected before AI execution)
 *   - Admin credit routes (add/reset/usage)
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp }            from "../../app.js";
import { prisma }              from "../../lib/prisma.js";
import {
  createUser,
  createVerifiedAdmin,
  createVerifiedUser,
  signAccessToken,
} from "../_helpers/factories.js";
import { truncateAllTables } from "../_helpers/db.js";
import {
  MONTHLY_CREDITS,
  TOOL_CREDIT_COST,
  resolveToolFamily,
  creditCostForTool,
  getExecutionProfile,
  computeThreshold,
  resolveUsageState,
  assertCreditAccessOrThrow,
  consumeCreditsOnSuccess,
  adminAddCredits,
  adminResetCycle,
} from "../../modules/plans/entitlement-policy.js";
import { UserPlan } from "@prisma/client";

// ─── helpers ─────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// ─── Unit: policy functions ───────────────────────────────────────────────────

describe("Entitlements > Policy unit tests", () => {

  describe("MONTHLY_CREDITS", () => {
    it("REGULAR has 100 credits", () => {
      expect(MONTHLY_CREDITS[UserPlan.REGULAR]).toBe(100);
    });
    it("PRO has 1200 credits", () => {
      expect(MONTHLY_CREDITS[UserPlan.PRO]).toBe(1200);
    });
    it("PRO_PLUS has very high allowance", () => {
      expect(MONTHLY_CREDITS[UserPlan.PRO_PLUS]).toBeGreaterThan(10_000);
    });
  });

  describe("Tool credit costs", () => {
    it.each([
      ["JD_EXTRACTION", 1],
      ["FIT",           2],
      ["RESUME_ADVICE", 2],
      ["RESUME_HELP",   2],
      ["COVER_LETTER",  3],
      ["COVER_LETTER_HELP", 3],
      ["INTERVIEW_PREP", 3],
    ])("%s costs %d credits", (toolKind, expected) => {
      expect(creditCostForTool(toolKind)).toBe(expected);
    });

    it("unknown tool kind falls back to highest cost", () => {
      expect(creditCostForTool("UNKNOWN_TOOL")).toBe(3);
    });
  });

  describe("resolveToolFamily", () => {
    it("maps RESUME_HELP and RESUME_ADVICE to RESUME family", () => {
      expect(resolveToolFamily("RESUME_HELP")).toBe("RESUME");
      expect(resolveToolFamily("RESUME_ADVICE")).toBe("RESUME");
    });
    it("maps COVER_LETTER_HELP and COVER_LETTER to COVER_LETTER family", () => {
      expect(resolveToolFamily("COVER_LETTER_HELP")).toBe("COVER_LETTER");
      expect(resolveToolFamily("COVER_LETTER")).toBe("COVER_LETTER");
    });
  });

  describe("getExecutionProfile", () => {
    it("REGULAR gets low effort and verbosity", () => {
      const p = getExecutionProfile(UserPlan.REGULAR);
      expect(p.effort).toBe("low");
      expect(p.verbosity).toBe("low");
    });
    it("PRO gets medium effort and verbosity", () => {
      const p = getExecutionProfile(UserPlan.PRO);
      expect(p.effort).toBe("medium");
      expect(p.verbosity).toBe("medium");
    });
    it("PRO_PLUS gets medium effort and verbosity", () => {
      const p = getExecutionProfile(UserPlan.PRO_PLUS);
      expect(p.effort).toBe("medium");
      expect(p.verbosity).toBe("medium");
    });
    it("REGULAR has lower maxOutputTokens than PRO", () => {
      const regular = getExecutionProfile(UserPlan.REGULAR);
      const pro     = getExecutionProfile(UserPlan.PRO);
      expect(regular.maxOutputTokens).toBeLessThan(pro.maxOutputTokens);
    });
  });

  describe("computeThreshold", () => {
    it("returns OK when under 75%", () => {
      expect(computeThreshold(50, 100)).toBe("OK");
      expect(computeThreshold(74, 100)).toBe("OK");
    });
    it("returns WARNING_75 at exactly 75%", () => {
      expect(computeThreshold(75, 100)).toBe("WARNING_75");
    });
    it("returns WARNING_75 between 75% and 90%", () => {
      expect(computeThreshold(80, 100)).toBe("WARNING_75");
      expect(computeThreshold(89, 100)).toBe("WARNING_75");
    });
    it("returns WARNING_90 at exactly 90%", () => {
      expect(computeThreshold(90, 100)).toBe("WARNING_90");
    });
    it("returns BLOCKED at 100%", () => {
      expect(computeThreshold(100, 100)).toBe("BLOCKED");
    });
    it("returns BLOCKED when over 100%", () => {
      expect(computeThreshold(110, 100)).toBe("BLOCKED");
    });
    it("returns BLOCKED when total is 0", () => {
      expect(computeThreshold(0, 0)).toBe("BLOCKED");
    });
  });

});

// ─── Integration: credit lifecycle ───────────────────────────────────────────

describe("Entitlements > Credit lifecycle", () => {

  beforeEach(async () => { await truncateAllTables(); });

  it("resolveUsageState creates cycle row on first call", async () => {
    const { user } = await createVerifiedUser("usage-create@test.com", "Passw0rd!");
    const state = await resolveUsageState(user.id);

    expect(state.usedCredits).toBe(0);
    expect(state.baseCredits).toBe(MONTHLY_CREDITS[UserPlan.REGULAR]);
    expect(state.remaining).toBe(MONTHLY_CREDITS[UserPlan.REGULAR]);
    expect(state.isBlocked).toBe(false);
    expect(state.threshold).toBe("OK");
  });

  it("resolveUsageState is idempotent — second call returns same data", async () => {
    const { user } = await createVerifiedUser("usage-idempotent@test.com", "Passw0rd!");
    const a = await resolveUsageState(user.id);
    const b = await resolveUsageState(user.id);
    expect(a.usedCredits).toBe(b.usedCredits);
    expect(a.totalCredits).toBe(b.totalCredits);
  });

  it("consumeCreditsOnSuccess increments usedCredits by tool cost", async () => {
    const { user } = await createVerifiedUser("consume-credits@test.com", "Passw0rd!");
    await consumeCreditsOnSuccess(user.id, "FIT"); // cost 2
    const state = await resolveUsageState(user.id);
    expect(state.usedCredits).toBe(2);
    expect(state.remaining).toBe(MONTHLY_CREDITS[UserPlan.REGULAR] - 2);
  });

  it("multiple consumption calls accumulate correctly", async () => {
    const { user } = await createVerifiedUser("consume-multi@test.com", "Passw0rd!");
    await consumeCreditsOnSuccess(user.id, "FIT");           // 2
    await consumeCreditsOnSuccess(user.id, "COVER_LETTER");  // 3
    await consumeCreditsOnSuccess(user.id, "RESUME_ADVICE"); // 2
    const state = await resolveUsageState(user.id);
    expect(state.usedCredits).toBe(7);
  });

  it("assertCreditAccessOrThrow passes when credits remain", async () => {
    const { user } = await createVerifiedUser("access-ok@test.com", "Passw0rd!");
    await expect(assertCreditAccessOrThrow(user.id)).resolves.toBeUndefined();
  });

  it("assertCreditAccessOrThrow throws when user is at limit", async () => {
    const { user } = await createVerifiedUser("access-blocked@test.com", "Passw0rd!");

    // Exhaust credits by writing directly to the cycle row
    const now = new Date();
    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      100,
        bonusCredits:     0,
        usedCredits:      100, // fully exhausted
        planAtCycleStart: "REGULAR",
      },
    });

    await expect(assertCreditAccessOrThrow(user.id)).rejects.toMatchObject({
      code: "AI_QUOTA_EXCEEDED",
    });
  });

  it("PRO user at 1200 credits is blocked", async () => {
    const { user } = await createVerifiedUser("pro-blocked@test.com", "Passw0rd!");
    await prisma.user.update({ where: { id: user.id }, data: { plan: "PRO" } });

    const now = new Date();
    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      1200,
        bonusCredits:     0,
        usedCredits:      1200,
        planAtCycleStart: "PRO",
      },
    });

    await expect(assertCreditAccessOrThrow(user.id)).rejects.toMatchObject({
      code: "AI_QUOTA_EXCEEDED",
    });
  });

  it("bonus credits extend the available allowance", async () => {
    const { user } = await createVerifiedUser("bonus-credits@test.com", "Passw0rd!");
    const admin    = await createVerifiedAdmin("bonus-admin@test.com");

    // Exhaust base credits
    const now = new Date();
    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      100,
        bonusCredits:     0,
        usedCredits:      100,
        planAtCycleStart: "REGULAR",
      },
    });

    // Admin adds 50 bonus credits
    await adminAddCredits(user.id, 50, admin.user.id, "Test bonus");

    const state = await resolveUsageState(user.id);
    expect(state.bonusCredits).toBe(50);
    expect(state.remaining).toBe(50);
    expect(state.isBlocked).toBe(false);
  });

});

// ─── Integration: admin actions ───────────────────────────────────────────────

describe("Entitlements > Admin actions", () => {

  beforeEach(async () => { await truncateAllTables(); });

  it("adminAddCredits writes an audit record", async () => {
    const { user } = await createVerifiedUser("audit-add@test.com", "Passw0rd!");
    const admin    = await createVerifiedAdmin("audit-admin@test.com");
    const now      = new Date();

    await adminAddCredits(user.id, 25, admin.user.id, "Reward");

    const adj = await prisma.planUsageAdjustment.findFirst({
      where: { userId: user.id },
    });
    expect(adj).not.toBeNull();
    expect(adj!.adjustmentType).toBe("ADD_CREDITS");
    expect(adj!.creditsAdded).toBe(25);
    expect(adj!.adminUserId).toBe(admin.user.id);
    expect(adj!.note).toBe("Reward");
  });

  it("adminResetCycle zeroes out used and bonus credits", async () => {
    const { user } = await createVerifiedUser("reset-cycle@test.com", "Passw0rd!");
    const admin    = await createVerifiedAdmin("reset-admin@test.com");
    const now      = new Date();

    // Create a messy cycle state
    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      100,
        bonusCredits:     30,
        usedCredits:      95,
        planAtCycleStart: "REGULAR",
      },
    });

    await adminResetCycle(user.id, admin.user.id, "Reset for testing");

    const state = await resolveUsageState(user.id);
    expect(state.usedCredits).toBe(0);
    expect(state.bonusCredits).toBe(0);
    expect(state.baseCredits).toBe(MONTHLY_CREDITS[UserPlan.REGULAR]);
    expect(state.isBlocked).toBe(false);
  });

  it("adminResetCycle writes an audit record", async () => {
    const { user } = await createVerifiedUser("reset-audit@test.com", "Passw0rd!");
    const admin    = await createVerifiedAdmin("reset-audit-admin@test.com");

    await adminResetCycle(user.id, admin.user.id);

    const adj = await prisma.planUsageAdjustment.findFirst({
      where: { userId: user.id },
    });
    expect(adj).not.toBeNull();
    expect(adj!.adjustmentType).toBe("RESET_CYCLE");
    expect(adj!.adminUserId).toBe(admin.user.id);
  });

});

// ─── Integration: HTTP enforcement ───────────────────────────────────────────

describe("Entitlements > HTTP enforcement", () => {

  const app: FastifyInstance = buildApp();
  beforeAll(async ()  => { await app.ready(); });
  afterAll(async ()   => { await app.close(); });
  beforeEach(async () => { await truncateAllTables(); });

  it("blocked user gets 403 AI_QUOTA_EXCEEDED on JD text extraction", async () => {
    const { user, token } = await createVerifiedUser("blocked-jd@test.com", "Passw0rd!");
    const now = new Date();

    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      100,
        bonusCredits:     0,
        usedCredits:      100,
        planAtCycleStart: "REGULAR",
      },
    });

    const res = await app.inject({
      method:   "POST",
      url:      "/api/v1/ai/application-from-jd",
      headers:  authHeader(token),
      payload:  { text: "Software engineer role at Acme Corp." },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  it("unblocked user with credits remaining gets through the guard", async () => {
    const { user, token } = await createVerifiedUser("unblocked-jd@test.com", "Passw0rd!");
    // No cycle row — fresh user with full allowance
    const res = await app.inject({
      method:   "POST",
      url:      "/api/v1/ai/application-from-jd",
      headers:  authHeader(token),
      // Deliberately empty — should fail validation (400), not quota check (403)
      payload:  { text: "" },
    });

    // Should get a validation error (400), not a quota error (403)
    expect(res.statusCode).not.toBe(403);
  });

});

// ─── Integration: admin credit HTTP routes ────────────────────────────────────

describe("Entitlements > Admin credit HTTP routes", () => {

  const app: FastifyInstance = buildApp();
  beforeAll(async ()  => { await app.ready(); });
  afterAll(async ()   => { await app.close(); });
  beforeEach(async () => { await truncateAllTables(); });

  it("GET /admin/users/:userId/usage returns usage state", async () => {
    const { user }  = await createVerifiedUser("admin-usage-user@test.com", "Passw0rd!");
    const { token } = await createVerifiedAdmin("admin-usage-admin@test.com");

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/admin/users/${user.id}/usage`,
      headers: authHeader(token),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      usedCredits:  0,
      baseCredits:  100,
      isBlocked:    false,
      threshold:    "OK",
    });
  });

  it("POST /admin/users/:userId/credits/add increases bonusCredits", async () => {
    const { user }  = await createVerifiedUser("admin-add-user@test.com", "Passw0rd!");
    const { token } = await createVerifiedAdmin("admin-add-admin@test.com");

    const res = await app.inject({
      method:   "POST",
      url:      `/api/v1/admin/users/${user.id}/credits/add`,
      headers:  authHeader(token),
      payload:  { credits: 50, note: "Test grant" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    const state = await resolveUsageState(user.id);
    expect(state.bonusCredits).toBe(50);
    expect(state.totalCredits).toBe(150);
  });

  it("POST /admin/users/:userId/credits/reset zeroes the cycle", async () => {
    const { user }  = await createVerifiedUser("admin-reset-user@test.com", "Passw0rd!");
    const { token } = await createVerifiedAdmin("admin-reset-admin@test.com");
    const now = new Date();

    // Seed a heavily used cycle
    await prisma.planUsageCycle.create({
      data: {
        userId:           user.id,
        cycleYear:        now.getUTCFullYear(),
        cycleMonth:       now.getUTCMonth() + 1,
        baseCredits:      100,
        bonusCredits:     20,
        usedCredits:      98,
        planAtCycleStart: "REGULAR",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/credits/reset`,
      headers: authHeader(token),
    });

    expect(res.statusCode).toBe(200);

    const state = await resolveUsageState(user.id);
    expect(state.usedCredits).toBe(0);
    expect(state.bonusCredits).toBe(0);
    expect(state.isBlocked).toBe(false);
  });

  it("POST /admin/users/:userId/credits/add requires admin role", async () => {
    const { user: target } = await createVerifiedUser("add-target@test.com", "Passw0rd!");
    const { token }        = await createVerifiedUser("add-nonadmin@test.com", "Passw0rd!");

    const res = await app.inject({
      method:   "POST",
      url:      `/api/v1/admin/users/${target.id}/credits/add`,
      headers:  authHeader(token),
      payload:  { credits: 10 },
    });

    expect(res.statusCode).toBe(403);
  });

  it("POST /admin/users/:userId/credits/add rejects zero or negative credits", async () => {
    const { user }  = await createVerifiedUser("add-zero-user@test.com", "Passw0rd!");
    const { token } = await createVerifiedAdmin("add-zero-admin@test.com");

    const res = await app.inject({
      method:   "POST",
      url:      `/api/v1/admin/users/${user.id}/credits/add`,
      headers:  authHeader(token),
      payload:  { credits: 0 },
    });

    expect(res.statusCode).toBe(400);
  });

});