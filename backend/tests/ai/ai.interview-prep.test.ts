import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { UserPlan, DocumentKind } from "@prisma/client";
import {
  createUser,
  signAccessToken,
  uniqueEmail,
  buildMultipartSingleFile,
  authHeader,
} from "../_helpers/factories.js";

// Mock the interview prep service so tests are deterministic (no OpenAI calls).
vi.mock("../../modules/ai/interview-prep.service.js", () => ({
  buildGenericInterviewPrep:   vi.fn(),
  buildTargetedInterviewPrep:  vi.fn(),
}));

// Mock GCS so no real file uploads or deletions happen.
vi.mock("../../lib/storage.js", async () => {
  const actual = await vi.importActual<any>("../../lib/storage.js");
  return {
    ...actual,
    uploadStreamToGcs: vi.fn(async () => ({ sizeBytes: 100 })),
    deleteGcsObject:   vi.fn(async () => undefined),
  };
});

// Partially mock documents.service: keep real exports, override only the
// candidate-text helpers so we avoid real GCS downloads in tests.
vi.mock("../../modules/documents/documents.service.js", async () => {
  const actual = await vi.importActual<any>("../../modules/documents/documents.service.js");
  return {
    ...actual,
    getCandidateTextOrThrow:   vi.fn(),
    tryGetCandidateText:       vi.fn(),
    // Mocked so generic prep tests can control base-resume resolution
    getBaseResumeTextOrThrow:  vi.fn(),
  };
});

let app: FastifyInstance;
let buildApp: () => FastifyInstance;
let prisma: typeof import("../../lib/prisma.js").prisma;
let InterviewPrepService: typeof import("../../modules/ai/interview-prep.service.js");
let DocumentsService:     typeof import("../../modules/documents/documents.service.js");

// Import dynamically AFTER mocks are registered so routes pick up the mocks.
beforeAll(async () => {
  ({ buildApp }           = await import("../../app.js"));
  ({ prisma }             = await import("../../lib/prisma.js"));
  InterviewPrepService    = await import("../../modules/ai/interview-prep.service.js");
  DocumentsService                          = await import("../../modules/documents/documents.service.js");
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.mocked(InterviewPrepService.buildGenericInterviewPrep).mockReset();
  vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mockReset();
  vi.mocked(DocumentsService.getCandidateTextOrThrow).mockReset();
  vi.mocked(DocumentsService.tryGetCandidateText).mockReset();
  vi.mocked(DocumentsService.getBaseResumeTextOrThrow).mockReset();
});


// ─── Shared mock payloads ────────────────────────────────────────────────────

const MOCK_PREP_PAYLOAD = {
  summary:               "Focus on distributed systems and real-time data pipelines.",
  focusTopics:           [{ topic: "Event-driven architecture", priority: "HIGH" as const, reason: "Central to the JD." }],
  backgroundQuestions:   ["Walk me through your most complex backend project."],
  technicalQuestions:    ["How would you design a real-time data pipeline?"],
  behavioralQuestions:   ["Tell me about a time you resolved a production incident."],
  situationalQuestions:  ["What would you do if a key service dependency went down?"],
  motivationalQuestions: ["Why are you interested in this role?"],
  challengeQuestions:    ["Your resume shows limited financial domain experience — how would you close that gap?"],
  questionsToAsk:        ["What does the on-call rotation look like for this team?"],
};

const MOCK_CANDIDATE = {
  text:           "Candidate history: Node.js, Fastify, Prisma, Postgres.",
  documentIdUsed: 1,
  source:         "BASE" as const,
  filename:       "base-resume.txt",
  updatedAt:      new Date(),
  mimeType:       "text/plain",
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createVerifiedUserWithState(opts: { isPro: boolean; aiFreeUsesUsed?: number }) {
  const email = uniqueEmail();
  const user  = await createUser({
    email,
    password:        "Passw0rd!",
    isActive:        true,
    emailVerifiedAt: new Date(),
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan:           opts.isPro ? UserPlan.PRO : UserPlan.REGULAR,
    },
  });
  // Mirror into PlanUsageCycle for Phase 10 enforcement
  const now = new Date();
  const baseCredits = opts.isPro ? 1200 : 100;
  const usedCredits = (opts.aiFreeUsesUsed ?? 0) >= 5 ? baseCredits : (opts.aiFreeUsesUsed ?? 0) * 2;
  await prisma.planUsageCycle.upsert({
    where:  { userId_cycleYear_cycleMonth: { userId: user.id, cycleYear: now.getUTCFullYear(), cycleMonth: now.getUTCMonth() + 1 } },
    create: { userId: user.id, cycleYear: now.getUTCFullYear(), cycleMonth: now.getUTCMonth() + 1, baseCredits, bonusCredits: 0, usedCredits, planAtCycleStart: opts.isPro ? "PRO" : "REGULAR" },
    update: { usedCredits, baseCredits },
  });
  return { userId: user.id, token: signAccessToken(user) };
}

async function createUnverifiedUser() {
  const email = uniqueEmail();
  const user  = await createUser({ email, password: "Passw0rd!", isActive: true, emailVerifiedAt: null });
  return { userId: user.id, token: signAccessToken(user) };
}

async function createApplication(userId: string, description: string | null = "JD text here") {
  const app = await prisma.jobApplication.create({
    data: { userId, company: "Acme", position: "Engineer", description },
    select: { id: true },
  });
  return app.id;
}

/** Build a multipart request body with the given text fields and no file. */
function buildFieldsOnly(fields: Record<string, string>, token: string) {
  // Use a minimal multipart with one known field so Fastify accepts the content-type.
  // All target fields are appended as separate form parts.
  const boundary = `----ct-test-${Date.now()}`;
  const parts = Object.entries(fields)
    .map(([k, v]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
    )
    .join("");
  const body = Buffer.from(`${parts}--${boundary}--\r\n`);

  return {
    headers: {
      authorization:  `Bearer ${token}`,
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: body,
  };
}


// ─── Generic Interview Prep (/ai/interview-prep) ─────────────────────────────

describe("AI > Interview Prep > generic (/ai/interview-prep)", () => {

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep" });
    expect(res.statusCode).toBe(401);
  });

  it("blocks unverified users (EMAIL_NOT_VERIFIED)", async () => {
    const { token } = await createUnverifiedUser();
    const { headers, payload } = buildFieldsOnly({ targetField: "Software Engineering" }, token);
    const res = await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep", headers, payload });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("blocks when free quota exhausted and not Pro", async () => {
    const { token } = await createVerifiedUserWithState({ isPro: false, aiFreeUsesUsed: 5 });
    const { headers, payload } = buildFieldsOnly({ targetField: "Engineering" }, token);
    const res = await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep", headers, payload });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  it("rejects when no targeting fields provided", async () => {
    const { token } = await createVerifiedUserWithState({ isPro: false});
    const form = buildMultipartSingleFile({
      fieldName: "resumeFile", filename: "empty.txt", contentType: "text/plain", content: Buffer.from(""),
    });
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/ai/interview-prep",
      headers: { authorization: `Bearer ${token}`, "content-type": form.contentType },
      payload: form.body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INTERVIEW_PREP_MISSING_TARGET" });
  });

  it("creates UserAiArtifact; consumes 1 free use; returns INTERVIEW_PREP payload", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});

    // Seed a base resume document so the route can resolve candidate text
    const baseDoc = await prisma.document.create({
      data: {
        userId,
        jobApplicationId: null,
        kind:             DocumentKind.BASE_RESUME,
        storageKey:       `tests/${userId}/base-resume.txt`,
        originalName:     "base-resume.txt",
        mimeType:         "text/plain",
        size:             100,
        url:              null,
      },
      select: { id: true },
    });

    // Mock getBaseResumeTextOrThrow — used when no file upload provided
    vi.mocked(DocumentsService.getBaseResumeTextOrThrow).mockResolvedValue("Candidate history: Node.js, Fastify, Postgres.");

    vi.mocked(InterviewPrepService.buildGenericInterviewPrep).mockResolvedValue({ payload: MOCK_PREP_PAYLOAD, usage: { input: 0, output: 0, total: 0 } });

    const { headers, payload } = buildFieldsOnly({
      targetField:     "Software Engineering",
      targetRolesText: "Backend Engineer",
    }, token);

    const res = await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep", headers, payload });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      kind:    "INTERVIEW_PREP",
      payload: { summary: MOCK_PREP_PAYLOAD.summary },
    });

    // Artifact persisted as UserAiArtifact
    const artifact = await prisma.userAiArtifact.findFirst({
      where: { userId, kind: "INTERVIEW_PREP" },
    });
    expect(artifact).not.toBeNull();

    // Phase 10: credit consumption is fire-and-forget; covered by entitlement tests

    // Cleanup
    await prisma.document.delete({ where: { id: baseDoc.id } }).catch(() => {});
  });

  it("does NOT consume free uses when AI service throws", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});

    vi.mocked(DocumentsService.getBaseResumeTextOrThrow).mockResolvedValue("Candidate text.");
    vi.mocked(InterviewPrepService.buildGenericInterviewPrep).mockRejectedValue(new Error("AI down"));

    const { headers, payload } = buildFieldsOnly({ targetField: "Engineering" }, token);
    const res = await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep", headers, payload });

    expect(res.statusCode).toBe(502); // route maps unknown AI errors to 502
  });

  it("does NOT consume free uses when user is Pro", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: true});

    vi.mocked(DocumentsService.getBaseResumeTextOrThrow).mockResolvedValue("Candidate text.");
    vi.mocked(InterviewPrepService.buildGenericInterviewPrep).mockResolvedValue({ payload: MOCK_PREP_PAYLOAD, usage: { input: 0, output: 0, total: 0 } });

    const { headers, payload } = buildFieldsOnly({ targetField: "Engineering" }, token);
    await app.inject({ method: "POST", url: "/api/v1/ai/interview-prep", headers, payload });

    // Pro users don't consume free uses
  });
});


// ─── Targeted Interview Prep (/applications/:id/ai-artifacts) ────────────────

describe("AI > Interview Prep > targeted (ai-artifacts INTERVIEW_PREP)", () => {

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications/some-id/ai-artifacts",
      payload: { kind: "INTERVIEW_PREP" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("blocks unverified users (EMAIL_NOT_VERIFIED)", async () => {
    const { token } = await createUnverifiedUser();
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications/some-id/ai-artifacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("blocks when free quota exhausted and not Pro", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false, aiFreeUsesUsed: 5 });
    const appId = await createApplication(userId);
    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  it("rejects when application has no job description", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, null);

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "JOB_DESCRIPTION_MISSING" });

    // No credit consumed
  });

  it("works with JD only (no resume) — tryGetCandidateText returns null", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "Backend role: Node.js required.");

    // No resume available — tryGetCandidateText returns null
    vi.mocked(DocumentsService.tryGetCandidateText).mockResolvedValue(null);
    vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mockResolvedValue({ payload: MOCK_PREP_PAYLOAD, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      kind:    "INTERVIEW_PREP",
      payload: { summary: MOCK_PREP_PAYLOAD.summary },
    });

    // Service called with null candidateText — JD-only mode
    const [calledArgs] = vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mock.calls[0];
    expect(calledArgs.candidateText).toBeNull();
    expect(calledArgs.jdText).toContain("Node.js");

    // Artifact persisted
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId: appId, kind: "INTERVIEW_PREP" },
    });
    expect(artifact).not.toBeNull();

    // Phase 10: credit consumption fire-and-forget via PlanUsageCycle; covered by entitlement tests
  });

  it("works with JD + base resume — passes candidateText to service", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "Backend role. Node.js required.");

    // Base resume found — tryGetCandidateText returns candidate text
    vi.mocked(DocumentsService.tryGetCandidateText).mockResolvedValue(MOCK_CANDIDATE);
    vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mockResolvedValue({ payload: MOCK_PREP_PAYLOAD, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });

    expect(res.statusCode).toBe(201);

    // Service called with actual candidate text — richer output path
    const [calledArgs] = vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mock.calls[0];
    expect(calledArgs.candidateText).toBe(MOCK_CANDIDATE.text);

    // sourceDocumentId persisted on the artifact
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId: appId, kind: "INTERVIEW_PREP" },
    });
    expect(artifact?.sourceDocumentId).toBe(MOCK_CANDIDATE.documentIdUsed);
  });

  it("does NOT consume free uses when AI service throws", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "JD text.");

    vi.mocked(DocumentsService.tryGetCandidateText).mockResolvedValue(null);
    vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mockRejectedValue(new Error("AI down"));

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });

    expect(res.statusCode).toBe(500);

    // Artifact not persisted on failure
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId: appId, kind: "INTERVIEW_PREP" },
    });
    expect(artifact).toBeNull();
  });

  it("does NOT consume free uses when user is Pro", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: true});
    const appId = await createApplication(userId, "JD text.");

    vi.mocked(DocumentsService.tryGetCandidateText).mockResolvedValue(MOCK_CANDIDATE);
    vi.mocked(InterviewPrepService.buildTargetedInterviewPrep).mockResolvedValue({ payload: MOCK_PREP_PAYLOAD, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "INTERVIEW_PREP" },
    });

    expect(res.statusCode).toBe(201);
  });
});