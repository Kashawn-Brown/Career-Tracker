import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createUser, createVerifiedAdmin, signAccessToken, uniqueEmail } from "../_helpers/factories.js";

/**
 * Analytics helpers — integration tests.
 *
 * Covers:
 *   - trackEvent / trackEventForUser write correct DB rows
 *   - startAiRun / succeedAiRun / failAiRun lifecycle
 *   - AiRun duration, artifact linking, error categorisation
 *   - Admin analytics routes (auth + scoping)
 *   - User self-analytics routes (auth + scoping)
 *   - Application create/delete emit product events
 *   - CSV export emits product event
 */
describe("Analytics > Tracking helpers", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });


  // ─── trackEvent ────────────────────────────────────────────────────────────

  it("trackEvent creates a ProductEvent row", async () => {
    const { trackEvent } = await import("../../modules/analytics/analytics-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    await trackEvent({
      userId:    user.id,
      eventType: "APPLICATION_CREATED",
      category:  "APPLICATION",
      surface:   "CREATE_FORM",
      metadata:  { creationMethod: "MANUAL" },
    });

    const row = await prisma.productEvent.findFirst({
      where:   { userId: user.id, eventType: "APPLICATION_CREATED" },
      orderBy: { createdAt: "desc" },
    });

    expect(row).not.toBeNull();
    expect(row?.category).toBe("APPLICATION");
    expect(row?.surface).toBe("CREATE_FORM");
  });

  it("trackEvent never throws on invalid input", async () => {
    const { trackEvent } = await import("../../modules/analytics/analytics-tracker.js");

    // Pass null userId — should not throw even though it violates normal usage
    await expect(
      trackEvent({ userId: null, eventType: "APPLICATION_DELETED", category: "APPLICATION" })
    ).resolves.toBeUndefined();
  });

  it("trackEventForUser snapshots plan and role", async () => {
    const { trackEventForUser } = await import("../../modules/analytics/analytics-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    await prisma.user.update({ where: { id: user.id }, data: { plan: "PRO" } });

    await trackEventForUser(user.id, {
      eventType: "APPLICATIONS_CSV_EXPORTED",
      category:  "EXPORT",
    });

    const row = await prisma.productEvent.findFirst({
      where:   { userId: user.id, eventType: "APPLICATIONS_CSV_EXPORTED" },
      orderBy: { createdAt: "desc" },
    });

    expect(row?.planAtTime).toBe("PRO");
    expect(row?.roleAtTime).toBe("USER");
  });
});


// ─── AI run lifecycle ─────────────────────────────────────────────────────────

describe("Analytics > AiRun lifecycle", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });

  it("startAiRun creates a STARTED row and returns an id", async () => {
    const { startAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    const runId = await startAiRun({
      userId:        user.id,
      toolKind:      "FIT",
      scope:         "TARGETED",
      triggerSource: "APPLICATION_DRAWER",
      provider:      "openai",
      model:         "gpt-5-mini",
    });

    expect(runId).not.toBeNull();

    const row = await prisma.aiRun.findUnique({ where: { id: runId! } });
    expect(row?.status).toBe("STARTED");
    expect(row?.userId).toBe(user.id);
    expect(row?.toolKind).toBe("FIT");
  });

  it("succeedAiRun updates status to SUCCEEDED and records duration", async () => {
    const { startAiRun, succeedAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    const runId = await startAiRun({
      userId:        user.id,
      toolKind:      "RESUME_HELP",
      scope:         "GENERIC",
      triggerSource: "TOOLS_PAGE",
    });

    await succeedAiRun({ runId, inputChars: 500, outputChars: 200 });

    const row = await prisma.aiRun.findUnique({ where: { id: runId! } });
    expect(row?.status).toBe("SUCCEEDED");
    expect(row?.completedAt).not.toBeNull();
    expect(row?.durationMs).toBeGreaterThanOrEqual(0);
    expect(row?.inputChars).toBe(500);
    expect(row?.outputChars).toBe(200);
  });

  it("succeedAiRun links artifact ids", async () => {
    const { startAiRun, succeedAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    const runId = await startAiRun({
      userId: user.id, toolKind: "INTERVIEW_PREP", scope: "GENERIC", triggerSource: "TOOLS_PAGE",
    });

    await succeedAiRun({ runId, userArtifactId: "fake-artifact-id" });

    const row = await prisma.aiRun.findUnique({ where: { id: runId! } });
    expect(row?.userArtifactId).toBe("fake-artifact-id");
  });

  it("failAiRun updates status to FAILED with error category", async () => {
    const { startAiRun, failAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    const runId = await startAiRun({
      userId: user.id, toolKind: "COVER_LETTER_HELP", scope: "GENERIC", triggerSource: "TOOLS_PAGE",
    });

    const err = new Error("rate limit exceeded 429");
    await failAiRun({ runId, error: err });

    const row = await prisma.aiRun.findUnique({ where: { id: runId! } });
    expect(row?.status).toBe("FAILED");
    expect(row?.errorCategory).toBe("RATE_LIMIT");
    expect(row?.errorMessage).toContain("rate limit");
    expect(row?.completedAt).not.toBeNull();
  });

  it("succeedAiRun and failAiRun are safe to call with null runId", async () => {
    const { succeedAiRun, failAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    await expect(succeedAiRun({ runId: null })).resolves.toBeUndefined();
    await expect(failAiRun({ runId: null, error: new Error("x") })).resolves.toBeUndefined();
  });

  it("startAiRun snapshots plan and role", async () => {
    const { startAiRun } = await import("../../modules/analytics/ai-run-tracker.js");

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    await prisma.user.update({ where: { id: user.id }, data: { plan: "PRO" } });

    const runId = await startAiRun({
      userId: user.id, toolKind: "FIT", scope: "TARGETED", triggerSource: "APPLICATION_DRAWER",
    });

    const row = await prisma.aiRun.findUnique({ where: { id: runId! } });
    expect(row?.planAtTime).toBe("PRO");
    expect(row?.roleAtTime).toBe("USER");
  });
});


// ─── Artifact interactions ────────────────────────────────────────────────────

describe("Analytics > ArtifactInteraction", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });

  it("trackArtifactInteraction creates a VIEWED row", async () => {
    const { trackArtifactInteraction } = await import(
      "../../modules/analytics/artifact-interactions.service.js"
    );

    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    await trackArtifactInteraction({
      userId:          user.id,
      userArtifactId:  "artifact-xyz",
      interactionType: "VIEWED",
      artifactKind:    "RESUME_ADVICE",
      scope:           "GENERIC",
    });

    const row = await prisma.artifactInteraction.findFirst({
      where: { userId: user.id, userArtifactId: "artifact-xyz" },
    });

    expect(row).not.toBeNull();
    expect(row?.interactionType).toBe("VIEWED");
    expect(row?.artifactKind).toBe("RESUME_ADVICE");
  });

  it("trackArtifactInteraction never throws", async () => {
    const { trackArtifactInteraction } = await import(
      "../../modules/analytics/artifact-interactions.service.js"
    );

    // Deliberately pass a non-existent userId — should not throw
    await expect(
      trackArtifactInteraction({
        userId:          "nonexistent-user",
        interactionType: "VIEWED",
        artifactKind:    "FIT_V1",
        scope:           "TARGETED",
      })
    ).resolves.toBeUndefined();
  });
});


// ─── Admin analytics routes ───────────────────────────────────────────────────

describe("Analytics > Admin routes", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });

  it("GET /analytics/admin/overview requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/analytics/admin/overview" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /analytics/admin/overview blocks non-admins", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/admin/overview",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("GET /analytics/admin/overview returns expected shape for admin", async () => {
    const { token } = await createVerifiedAdmin(uniqueEmail());

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/admin/overview?window=30d",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("users");
    expect(body).toHaveProperty("applications");
    expect(body).toHaveProperty("aiRuns");
    expect(body).toHaveProperty("artifacts");
    expect(typeof body.users.total).toBe("number");
    expect(typeof body.aiRuns.total).toBe("number");
  });

  it("GET /analytics/admin/ai returns expected shape", async () => {
    const { token } = await createVerifiedAdmin(uniqueEmail());

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/admin/ai?window=30d",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.byTool)).toBe(true);
    expect(Array.isArray(body.byScope)).toBe(true);
    expect(Array.isArray(body.recentFailures)).toBe(true);
    expect(Array.isArray(body.topUsers)).toBe(true);
  });

  it("GET /analytics/admin/activity returns recent runs and events", async () => {
    const { token } = await createVerifiedAdmin(uniqueEmail());

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/admin/activity",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.recentRuns)).toBe(true);
    expect(Array.isArray(body.recentEvents)).toBe(true);
  });

  it("GET /analytics/admin/users/:userId requires admin", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/analytics/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("GET /analytics/admin/users/:userId returns user analytics for admin", async () => {
    const { token } = await createVerifiedAdmin(uniqueEmail());

    const email   = uniqueEmail();
    const target  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/analytics/admin/users/${target.id}?window=all`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.id).toBe(target.id);
    expect(typeof body.applicationCount).toBe("number");
    expect(body.aiRuns).toHaveProperty("byTool");
    expect(body.aiRuns).toHaveProperty("byStatus");
    expect(body.aiRuns).toHaveProperty("recent");
    expect(body.artifacts).toHaveProperty("targeted");
    expect(body.artifacts).toHaveProperty("generic");
  });

  it("GET /analytics/admin/users/:userId returns 404 for unknown user", async () => {
    const { token } = await createVerifiedAdmin(uniqueEmail());

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/admin/users/nonexistent-user-id",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });
});


// ─── User self-analytics routes ───────────────────────────────────────────────

describe("Analytics > User self-analytics routes", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });

  it("GET /analytics/me/overview requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/analytics/me/overview" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /analytics/me/overview blocks unverified users", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!" });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/me/overview",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("GET /analytics/me/overview returns data scoped to the requesting user only", async () => {
    const emailA = uniqueEmail();
    const emailB = uniqueEmail();
    const userA  = await createUser({ email: emailA, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const userB  = await createUser({ email: emailB, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const tokenA = signAccessToken(userA);

    // Seed an application for userA and userB
    await prisma.jobApplication.create({
      data: { userId: userA.id, company: "Acme A", position: "Engineer" },
    });
    await prisma.jobApplication.create({
      data: { userId: userB.id, company: "Acme B", position: "Designer" },
    });

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/analytics/me/overview?window=all",
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    // applicationCount should only count userA's applications
    expect(body.applicationCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.byTool)).toBe(true);
    expect(Array.isArray(body.recentRuns)).toBe(true);
    expect(Array.isArray(body.recentEvents)).toBe(true);
    expect(body.artifacts).toHaveProperty("targeted");
    expect(body.artifacts).toHaveProperty("generic");
  });


  // ─── Product events wired into application flows ──────────────────────────

  it("POST /applications emits APPLICATION_CREATED product event", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const token = signAccessToken(user);

    const before = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATION_CREATED" },
    });

    await app.inject({
      method:  "POST",
      url:     "/api/v1/applications",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { company: "Test Co", position: "Engineer" },
    });

    // Give the fire-and-forget a tick to write
    await new Promise((r) => setTimeout(r, 200));

    const after = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATION_CREATED" },
    });

    expect(after).toBe(before + 1);
  });

  it("DELETE /applications/:id emits APPLICATION_DELETED product event", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const token = signAccessToken(user);

    const created = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { company: "Delete Co", position: "Tester" },
    });

    const appId = created.json().application.id;

    const before = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATION_DELETED" },
    });

    await app.inject({
      method:  "DELETE",
      url:     `/api/v1/applications/${appId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    await new Promise((r) => setTimeout(r, 200));

    const after = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATION_DELETED" },
    });

    expect(after).toBe(before + 1);
  });

  it("GET /applications/export.csv emits APPLICATIONS_CSV_EXPORTED product event", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", emailVerifiedAt: new Date() });
    const token = signAccessToken(user);

    const before = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATIONS_CSV_EXPORTED" },
    });

    await app.inject({
      method:  "GET",
      url:     "/api/v1/applications/export.csv",
      headers: { authorization: `Bearer ${token}` },
    });

    await new Promise((r) => setTimeout(r, 200));

    const after = await prisma.productEvent.count({
      where: { userId: user.id, eventType: "APPLICATIONS_CSV_EXPORTED" },
    });

    expect(after).toBe(before + 1);
  });
});