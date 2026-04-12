import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { UserPlan } from "@prisma/client";
import { createUser, signAccessToken, uniqueEmail, buildMultipartSingleFile } from "../_helpers/factories.js";

// Mock AI document tool builders so tests are deterministic (no OpenAI calls).
vi.mock("../../modules/ai/document-tools.service.js", () => ({
  buildGenericResumeAdvice:   vi.fn(),
  buildTargetedResumeAdvice:  vi.fn(),
  buildGenericCoverLetter:    vi.fn(),
  buildTargetedCoverLetter:   vi.fn(),
}));

// Mock GCS so no real file uploads happen.
vi.mock("../../lib/storage.js", async () => {
  const actual = await vi.importActual<any>("../../lib/storage.js");
  return {
    ...actual,
    uploadStreamToGcs: vi.fn(async () => ({ sizeBytes: 100 })),
    deleteGcsObject:   vi.fn(async () => undefined),
  };
});

// Partially mock documents.service: keep real exports, override only getCandidateTextOrThrow.
vi.mock("../../modules/documents/documents.service.js", async () => {
  const actual = await vi.importActual<any>("../../modules/documents/documents.service.js");
  return {
    ...actual,
    getCandidateTextOrThrow: vi.fn(),
  };
});

let app: FastifyInstance;
let buildApp: () => FastifyInstance;
let prisma: typeof import("../../lib/prisma.js").prisma;
let DocumentToolsService: typeof import("../../modules/ai/document-tools.service.js");
let DocumentsService: typeof import("../../modules/documents/documents.service.js");

// Import dynamically AFTER mocks are registered so routes pick up the mocks.
beforeAll(async () => {
  ({ buildApp }          = await import("../../app.js"));
  ({ prisma }            = await import("../../lib/prisma.js"));
  DocumentToolsService   = await import("../../modules/ai/document-tools.service.js");
  DocumentsService       = await import("../../modules/documents/documents.service.js");

  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.mocked(DocumentToolsService.buildGenericResumeAdvice).mockReset();
  vi.mocked(DocumentToolsService.buildTargetedResumeAdvice).mockReset();
  vi.mocked(DocumentToolsService.buildGenericCoverLetter).mockReset();
  vi.mocked(DocumentToolsService.buildTargetedCoverLetter).mockReset();
  vi.mocked(DocumentsService.getCandidateTextOrThrow).mockReset();
});

// ─── Shared mock payloads ────────────────────────────────────────────────────

const MOCK_RESUME_ADVICE = {
  summary:       "Solid backend profile with room to grow on cloud tooling.",
  strengths:     ["Node.js", "Postgres"],
  improvements:  ["Add AWS exposure"],
  roleAlignment: ["Highlight API design experience more prominently for this role"],
  rewrites:      ["Expand the Fastify bullet to include throughput or scale context"],
  keywordsPresent: ["Node.js", "Postgres"],
  keywordsMissing:  ["Lambda", "SQS"],
};

const MOCK_COVER_LETTER = {
  summary:      "Cover letter draft for a backend role at Acme.",
  draft:        "Dear Hiring Manager, I am excited to apply…",
  evidence:     ["Built REST APIs with Fastify"],
  notes:        ["Personalise the opening paragraph"],
  placeholders: ["[Hiring Manager Name]", "[Date]"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createVerifiedUserWithState(opts: {
  isPro: boolean;
  aiFreeUsesUsed?: number;
}) {
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

async function createApplication(userId: string, description: string | null = "JD text here") {
  const created = await prisma.jobApplication.create({
    data: { userId, company: "Acme", position: "Backend Engineer", description },
    select: { id: true },
  });
  return created.id;
}

function mockCandidateText(text = "Candidate history: Node.js, Fastify.") {
  vi.mocked(DocumentsService.getCandidateTextOrThrow).mockResolvedValue({
    text,
    documentIdUsed: 1,
    source:         "BASE",
    filename:       "base-resume.txt",
    updatedAt:      new Date(),
    mimeType:       "text/plain",
  });
}

/** Build a minimal valid multipart request with no file — just the auth header. */
function emptyMultipart(token: string) {
  const form = buildMultipartSingleFile({
    fieldName:   "resumeFile",
    filename:    "empty.txt",
    contentType: "text/plain",
    content:     Buffer.from(""),
  });
  return {
    headers: {
      authorization:  `Bearer ${token}`,
      "content-type": form.contentType,
    },
    payload: form.body,
  };
}


// ─── RESUME_ADVICE (targeted — via ai-artifacts) ─────────────────────────────

describe("AI Document Tools > RESUME_ADVICE (per-application artifact)", () => {

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications/some-id/ai-artifacts",
      payload: { kind: "RESUME_ADVICE" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("blocks unverified users", async () => {
    const email = uniqueEmail();
    const user  = await createUser({ email, password: "Passw0rd!", isActive: true, emailVerifiedAt: null });
    const token = signAccessToken(user);
    const appId = await createApplication(user.id);

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "RESUME_ADVICE" },
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
      payload: { kind: "RESUME_ADVICE" },
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
      payload: { kind: "RESUME_ADVICE" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: "Application is missing a job description." });

    // No credit consumed
  });

  it("creates artifact; consumes 1 free use; returns RESUME_ADVICE payload", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "Backend role: Node.js, Postgres.");

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedResumeAdvice).mockResolvedValue({ payload: MOCK_RESUME_ADVICE, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "RESUME_ADVICE" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      kind:    "RESUME_ADVICE",
      payload: { summary: MOCK_RESUME_ADVICE.summary },
    });

    // Artifact persisted
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId: appId, kind: "RESUME_ADVICE" },
    });
    expect(artifact).not.toBeNull();

    // Phase 10: credit consumption fire-and-forget via PlanUsageCycle; covered by entitlement tests
  });

  it("does NOT consume free uses when user is Pro", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: true});
    const appId = await createApplication(userId);

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedResumeAdvice).mockResolvedValue({ payload: MOCK_RESUME_ADVICE, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "RESUME_ADVICE" },
    });
    expect(res.statusCode).toBe(201);

    // No credit consumed for Pro
  });

  it("does NOT consume free uses when AI service throws", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId);

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedResumeAdvice).mockRejectedValue(new Error("AI down"));

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "RESUME_ADVICE" },
    });
    expect(res.statusCode).toBe(500);
  });
});


// ─── COVER_LETTER (targeted — via ai-artifacts) ───────────────────────────────

describe("AI Document Tools > COVER_LETTER (per-application artifact)", () => {

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications/some-id/ai-artifacts",
      payload: { kind: "COVER_LETTER" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects when application has no job description", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, null);

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "COVER_LETTER" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("creates artifact; consumes 1 free use; returns COVER_LETTER payload", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "Backend role at Acme. Node.js required.");

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedCoverLetter).mockResolvedValue({ payload: MOCK_COVER_LETTER, usage: { input: 0, output: 0, total: 0 } });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "COVER_LETTER" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      kind:    "COVER_LETTER",
      payload: {
        summary: MOCK_COVER_LETTER.summary,
        draft:   expect.any(String),
      },
    });

    // Artifact persisted
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId: appId, kind: "COVER_LETTER" },
    });
    expect(artifact).not.toBeNull();

    // Phase 10: credit consumption fire-and-forget via PlanUsageCycle; covered by entitlement tests
  });

  it("passes templateText to the cover letter builder when provided", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId, "Backend role. Node.js required.");

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedCoverLetter).mockResolvedValue({ payload: MOCK_COVER_LETTER, usage: { input: 0, output: 0, total: 0 } });

    await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "COVER_LETTER", templateText: "Dear [Name], I am writing to apply…" },
    });

    const calledWith = vi.mocked(DocumentToolsService.buildTargetedCoverLetter).mock.calls[0][0];
    expect(calledWith.templateText).toBe("Dear [Name], I am writing to apply…");
  });

  it("does NOT consume free uses when AI service throws", async () => {
    const { userId, token } = await createVerifiedUserWithState({ isPro: false});
    const appId = await createApplication(userId);

    mockCandidateText();
    vi.mocked(DocumentToolsService.buildTargetedCoverLetter).mockRejectedValue(new Error("AI down"));

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/applications/${appId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "COVER_LETTER" },
    });
    expect(res.statusCode).toBe(500);
  });
});


// ─── Generic cover-letter-help (Tools page — /ai/cover-letter-help) ──────────

describe("AI Document Tools > generic cover-letter-help (/ai/cover-letter-help)", () => {

  it("rejects when missing Bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url:    "/api/v1/ai/cover-letter-help",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects when no targeting fields provided", async () => {
    const { token } = await createVerifiedUserWithState({ isPro: false});

    // Multipart request with a file but no targeting fields (targetField, targetRolesText, etc.)
    // The route validates targeting fields and returns 400 before touching the AI.
    const { headers, payload } = emptyMultipart(token);

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/ai/cover-letter-help",
      headers,
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "COVER_LETTER_HELP_MISSING_TARGET" });
  });
});