import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";

// Mock the AI service so tests are deterministic (no OpenAI calls happen).
vi.mock("../../modules/ai/ai.service.js", () => ({
  buildApplicationDraftFromJd: vi.fn(),
}));

let app: FastifyInstance;

// Import dynamically AFTER mocks are registered (so they can be mocked),
// because buildApp mounts routes that import the AI service module.
let buildApp: () => FastifyInstance;
let prisma: typeof import("../../lib/prisma.js").prisma;
let AiService: typeof import("../../modules/ai/ai.service.js");

// Small helper: unique email per test avoids rate-limit collisions and unique constraints.
function uniqueEmail(prefix = "ai") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

// Helper function to register a user
async function registerUser() {
  const email = uniqueEmail();
  const password = "Password123!";

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password, name: "Test User" },
  });

  expect(res.statusCode).toBe(201);

  const body = res.json() as any;

  // Key contract: auth endpoints return an access token for Bearer auth.
  expect(typeof body.token).toBe("string");

  return { email, userId: body.user.id as string, token: body.token as string };
}

// Helper function to set the user states in the database (verified, aiProEnabled, aiFreeUsesUsed)
async function setUserState(userId: string, state: { verified?: boolean; aiProEnabled?: boolean; aiFreeUsesUsed?: number }) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(state.verified !== undefined ? { emailVerifiedAt: state.verified ? new Date() : null } : {}),
      ...(state.aiProEnabled !== undefined ? { aiProEnabled: state.aiProEnabled } : {}),
      ...(state.aiFreeUsesUsed !== undefined ? { aiFreeUsesUsed: state.aiFreeUsesUsed } : {}),
    },
  });
}

// Helper function to get the AI counters for a user
async function getAiCounters(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProEnabled: true, aiFreeUsesUsed: true },
  });

  if (!user) throw new Error("Test invariant: user should exist");
  return user;
}

// Before all tests, build the app and import the prisma and AiService modules (to mock)
beforeAll(async () => {
  ({ buildApp } = await import("../../app.js"));
  ({ prisma } = await import("../../lib/prisma.js"));
  AiService = await import("../../modules/ai/ai.service.js");

  app = buildApp();
  await app.ready();
});

// After all tests, close the app
afterAll(async () => {
  await app.close();
});
  
// Before each test, reset the mock behavior so one test can't affect another
beforeEach(() => {
  // Keep each test independent: reset mock behavior so one test can't affect another.
  vi.mocked(AiService.buildApplicationDraftFromJd).mockReset();
});

// Test suite for the application-from-jd route
describe("AI > application-from-jd", () => {

  // Test that the application-from-jd route rejects when missing Bearer token
  it("rejects when missing Bearer token", async () => {
    
    // Request the application-from-jd route without a Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      payload: { text: "Some JD text" },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token"
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  // Test that the route rejects when unverified user tries to access it
  it("blocks unverified users (EMAIL_NOT_VERIFIED)", async () => {
    
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to unverified
    await setUserState(userId, { verified: false, aiFreeUsesUsed: 0, aiProEnabled: false });

    // Mock the AI service to return a deterministic response
    vi.mocked(AiService.buildApplicationDraftFromJd).mockResolvedValue({
      extracted: { company: "Acme", position: "Software Engineer" },
      ai: { jdSummary: "summary", warnings: [] },
    });

    // Call application-from-jd route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the route rejects when free quota is exhausted and user is not Pro
  it("blocks when free quota is exhausted and user is not Pro (AI_QUOTA_EXCEEDED)", async () => {
    
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to not Pro and with free quota exhausted
    await setUserState(userId, { verified: true, aiProEnabled: false, aiFreeUsesUsed: 5 });

    // Call application-from-jd route
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    // Expect the response to be unsuccessful 403 + body has the code "AI_QUOTA_EXCEEDED"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  // Test that the route works when user is not pro under the quota
  it("allows when under quota; consumes exactly 1 free use on success", async () => {
    
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to not Pro and with free quota under the limit
    await setUserState(userId, { verified: true, aiProEnabled: false, aiFreeUsesUsed: 4 });

    // Mock the AI service to return a deterministic response
    vi.mocked(AiService.buildApplicationDraftFromJd).mockResolvedValue({
      extracted: {
        company: "Acme",
        position: "Software Engineer",
        location: "Toronto, ON",
        salaryText: "100k",
      },
      ai: { jdSummary: "summary", warnings: [] },
    });

    // Call application-from-jd route
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    // Expect the response to be successful 200
    expect(res.statusCode).toBe(200);

    // Sanity check: response is the AI object (this also protects the schema contract).
    expect(res.json()).toMatchObject({
      extracted: { company: "Acme", position: "Software Engineer" },
      ai: { jdSummary: "summary" },
    });

    // Get the AI counters for the user after the call (should go up by 1)
    const after = await getAiCounters(userId);
    expect(after.aiProEnabled).toBe(false);
    expect(after.aiFreeUsesUsed).toBe(5); // consumed exactly one
  });

  // Test that the route does not consume free uses when user is Pro
  it("does NOT consume free uses when user is Pro", async () => {
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to Pro and with free quota under the limit
    await setUserState(userId, { verified: true, aiProEnabled: true, aiFreeUsesUsed: 4 });

    // Mock the AI service to return a deterministic response
    vi.mocked(AiService.buildApplicationDraftFromJd).mockResolvedValue({
      extracted: { company: "Acme", position: "Software Engineer" },
      ai: { jdSummary: "summary", warnings: [] },
    });

    // Call application-from-jd route
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    expect(res.statusCode).toBe(200);

    // Get the AI counters for the user after the call (should not change)
    const after = await getAiCounters(userId);
    expect(after.aiProEnabled).toBe(true);
    expect(after.aiFreeUsesUsed).toBe(4); // unchanged
  });

  // Test that the route does not consume free uses if AI extraction fails
  it("does NOT consume free uses if AI extraction fails (AI_EXTRACTION_FAILED)", async () => {
    
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to not Pro and with free quota under the limit
    await setUserState(userId, { verified: true, aiProEnabled: false, aiFreeUsesUsed: 0 });

    // Force the AI service to fail; route should map this to a 502 AppError.
    vi.mocked(AiService.buildApplicationDraftFromJd).mockRejectedValue(new Error("OpenAI down"));

    // Call application-from-jd route
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    // Expect the response to be unsuccessful 502 + body has the code "AI_EXTRACTION_FAILED"
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ code: "AI_EXTRACTION_FAILED" });

    // Get the AI counters for the user after the call (should not change)
    const after = await getAiCounters(userId);
    expect(after.aiProEnabled).toBe(false);
    expect(after.aiFreeUsesUsed).toBe(0); // not consumed on failure
  });

  // Test that the route allows Pro users even if free uses are fully exhausted (still no consumption)
  it("allows Pro users even if free uses are fully exhausted (still no consumption)", async () => {
    // Register a user
    const { userId, token } = await registerUser();

    // Set the user to Pro and with free quota fully exhausted
    await setUserState(userId, { verified: true, aiProEnabled: true, aiFreeUsesUsed: 5 });

    // Mock the AI service to return a deterministic response
    vi.mocked(AiService.buildApplicationDraftFromJd).mockResolvedValue({
      extracted: { company: "Acme", position: "Software Engineer" },
      ai: { jdSummary: "summary", warnings: [] },
    });

    // Call application-from-jd route
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/application-from-jd",
      headers: { authorization: `Bearer ${token}` },
      payload: { text: "Some JD text" },
    });

    // Expect the response to be successful 200
    expect(res.statusCode).toBe(200);

    // Get the AI counters for the user after the call (should not change)
    const after = await getAiCounters(userId);
    expect(after.aiFreeUsesUsed).toBe(5);
  });
});
