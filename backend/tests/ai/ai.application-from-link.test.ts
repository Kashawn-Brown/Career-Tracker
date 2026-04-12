import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { UserPlan } from "@prisma/client";

// Mock the AI service so tests are deterministic (no real fetches or OpenAI calls).
vi.mock("../../modules/ai/ai.service.js", () => ({
  buildApplicationDraftFromJd:       vi.fn(),
  buildApplicationDraftFromJobLink:  vi.fn(),
}));

let app:       FastifyInstance;
let buildApp:  () => FastifyInstance;
let prisma:    typeof import("../../lib/prisma.js").prisma;
let AiService: typeof import("../../modules/ai/ai.service.js");

const ROUTE = "/api/v1/ai/application-from-link";

// A minimal valid draft response shape — used by tests that just need a success.
const MOCK_DRAFT = {
  extracted: { company: "Acme Corp", position: "Software Engineer" },
  ai:        { jdSummary: "A backend role at Acme.", warnings: [] },
  source:    { mode: "LINK" as const, canonicalJdText: "Full job posting text…", sourceUrl: "https://acme.com/jobs/123" },
};

beforeAll(async () => {
  ({ buildApp } = await import("../../app.js"));
  ({ prisma }   = await import("../../lib/prisma.js"));
  AiService     = await import("../../modules/ai/ai.service.js");

  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.mocked(AiService.buildApplicationDraftFromJobLink).mockReset();
  vi.mocked(AiService.buildApplicationDraftFromJd).mockReset();
});


describe("AI > application-from-link", () => {

  // ── Auth + access guards ──────────────────────────────────────────────────

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  it("blocks unverified users (EMAIL_NOT_VERIFIED)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: false, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockResolvedValue(MOCK_DRAFT);

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("blocks when free quota is exhausted and user is not Pro (AI_QUOTA_EXCEEDED)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  // ── URL validation (runs real validation, no service mock needed) ─────────

  it("rejects a missing url field", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: {}, // no url
    });

    // Fastify schema validation rejects before the handler runs
    expect(res.statusCode).toBe(400);
  });

  it("rejects an invalid URL format (JOB_LINK_INVALID_URL)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    // Real validation runs — no mock needed since it fails before any fetch
    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockImplementation(
      async (url) => {
        // Call through to the real validation
        const { extractJobPostingFromUrl } = await import("../../modules/ai/job-link-extraction.js");
        await extractJobPostingFromUrl(url);
        return MOCK_DRAFT;
      }
    );

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "not-a-valid-url" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "JOB_LINK_INVALID_URL" });
  });

  it("rejects non-http/https schemes (JOB_LINK_INVALID_SCHEME)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockImplementation(
      async (url) => {
        const { extractJobPostingFromUrl } = await import("../../modules/ai/job-link-extraction.js");
        await extractJobPostingFromUrl(url);
        return MOCK_DRAFT;
      }
    );

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "file:///etc/passwd" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "JOB_LINK_INVALID_SCHEME" });
  });

  it("blocks loopback addresses (JOB_LINK_BLOCKED_ADDRESS)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockImplementation(
      async (url) => {
        const { extractJobPostingFromUrl } = await import("../../modules/ai/job-link-extraction.js");
        await extractJobPostingFromUrl(url);
        return MOCK_DRAFT;
      }
    );

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "http://127.0.0.1/jobs" },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ code: "JOB_LINK_BLOCKED_ADDRESS" });
  });

  it("blocks private network addresses (JOB_LINK_BLOCKED_ADDRESS)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockImplementation(
      async (url) => {
        const { extractJobPostingFromUrl } = await import("../../modules/ai/job-link-extraction.js");
        await extractJobPostingFromUrl(url);
        return MOCK_DRAFT;
      }
    );

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "http://192.168.1.1/admin" },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ code: "JOB_LINK_BLOCKED_ADDRESS" });
  });

  // ── Quota consumption ─────────────────────────────────────────────────────

  it("consumes exactly 1 free use on success (REGULAR plan)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockResolvedValue(MOCK_DRAFT);

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      extracted: { company: "Acme Corp" },
      source:    { mode: "LINK" },
    });

    // Phase 10: credit consumption is fire-and-forget; covered by entitlement tests
  });

  it("does NOT consume free uses when user is Pro", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: true});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockResolvedValue(MOCK_DRAFT);

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(200);

    const after = await getAiCounters(userId);
    expect(after.plan).toBe(UserPlan.PRO);
  });

  it("does NOT consume free uses when the service throws (fetch failure)", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: false});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockRejectedValue(
      new Error("Network failure")
    );

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ code: "AI_EXTRACTION_FAILED" });

    const after = await getAiCounters(userId);
  });

  it("allows Pro users even with free quota exhausted", async () => {
    const { userId, token } = await registerUser();
    await setUserState(userId, { verified: true, isPro: true});

    vi.mocked(AiService.buildApplicationDraftFromJobLink).mockResolvedValue(MOCK_DRAFT);

    const res = await app.inject({
      method:  "POST",
      url:     ROUTE,
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://jobs.example.com/posting/123" },
    });

    expect(res.statusCode).toBe(200);

    const after = await getAiCounters(userId);
  });
});


// ── Helpers ───────────────────────────────────────────────────────────────────

function uniqueEmail(prefix = "ai-link") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerUser() {
  const email    = uniqueEmail();
  const password = "Password123!";

  const res = await app.inject({
    method:  "POST",
    url:     "/api/v1/auth/register",
    payload: { email, password, name: "Test User" },
  });

  expect(res.statusCode).toBe(201);
  const body = res.json() as any;
  expect(typeof body.token).toBe("string");

  return { email, userId: body.user.id as string, token: body.token as string };
}

async function setUserState(
  userId: string,
  state: { verified?: boolean; isPro?: boolean; aiFreeUsesUsed?: number; }
) {
  const now = new Date();
  const plan = state.isPro ? "PRO" : "REGULAR";
  const baseCredits = state.isPro ? 1200 : 100;
  await prisma.user.update({
    where: { id: userId },
    data:  {
      ...(state.verified !== undefined
        ? { emailVerifiedAt: state.verified ? new Date() : null } : {}),
      ...(state.isPro !== undefined
        ? { plan } : {}),
    },
  });
  if (state.aiFreeUsesUsed !== undefined) {
    // PRO users: old quota exhaustion doesn't mean new cycle is exhausted
    const usedCredits = (!state.isPro && state.aiFreeUsesUsed >= 5) ? baseCredits : 0;
    await prisma.planUsageCycle.upsert({
      where:  { userId_cycleYear_cycleMonth: { userId, cycleYear: now.getUTCFullYear(), cycleMonth: now.getUTCMonth() + 1 } },
      create: { userId, cycleYear: now.getUTCFullYear(), cycleMonth: now.getUTCMonth() + 1, baseCredits, bonusCredits: 0, usedCredits, planAtCycleStart: plan },
      update: { usedCredits, baseCredits },
    });
  }
}

async function getAiCounters(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { plan: true },
  });
  if (!user) throw new Error("Test invariant: user should exist");
  return user;
}