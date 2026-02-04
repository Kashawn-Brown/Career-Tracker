import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { DocumentKind } from "@prisma/client";

import { createUser, signAccessToken } from "../_helpers/factories.js";

// Mock AI service so tests are deterministic (no OpenAI calls).
vi.mock("../../modules/ai/ai.service.js", () => ({
  buildFitV1: vi.fn(),
}));

// Partially mock documents.service: keep real exports, override only getCandidateTextOrThrow
vi.mock("../../modules/documents/documents.service.js", async () => {
  const actual = await vi.importActual<any>("../../modules/documents/documents.service.js");
  return {
    ...actual,
    getCandidateTextOrThrow: vi.fn(),
  };
});

let app: FastifyInstance;

// Import dynamically AFTER mocks are registered,
// because buildApp mounts routes that import these modules.
let buildApp: () => FastifyInstance;
let prisma: typeof import("../../lib/prisma.js").prisma;
let AiService: typeof import("../../modules/ai/ai.service.js");
let DocumentsService: typeof import("../../modules/documents/documents.service.js");

beforeAll(async () => {
  ({ buildApp } = await import("../../app.js"));
  ({ prisma } = await import("../../lib/prisma.js"));
  AiService = await import("../../modules/ai/ai.service.js");
  DocumentsService = await import("../../modules/documents/documents.service.js");

  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.mocked(AiService.buildFitV1).mockReset();
  vi.mocked(DocumentsService.getCandidateTextOrThrow).mockReset();
});

// Test suite for the FIT_V1 AI artifact route (Generating Compatability)
describe("Applications > AI artifacts > FIT_V1", () => {
  
  // Test that the route rejects when missing Bearer token
  it("rejects when missing Bearer token", async () => {

    // Request the FIT_V1 AI artifact route without a Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications/some-id/ai-artifacts",
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token"
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  // Test that the route blocks unverified users (EMAIL_NOT_VERIFIED)
  it("blocks unverified users (EMAIL_NOT_VERIFIED)", async () => {
    
    // Create a user with an unverified email
    const { userId, token } = await createUserWithState({
      verified: false,
      aiProEnabled: false,
      aiFreeUsesUsed: 0,
    });

    // Create a job application in the database
    const jobApplicationId = await createApplicationInDb(userId, { description: "JD text" });

    // Even though AI/docs are mocked, middleware should block first.
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the route blocks when free quota is exhausted and user is not Pro (AI_QUOTA_EXCEEDED)
  it("blocks when free quota is exhausted and user is not Pro (AI_QUOTA_EXCEEDED)", async () => {
    
    // Create a user with a verified email, no Pro access, and 5 free uses used
    const { userId, token } = await createUserWithState({
      verified: true,
      aiProEnabled: false,
      aiFreeUsesUsed: 5,
    });

    // Create a job application in the database
    const jobApplicationId = await createApplicationInDb(userId, { description: "JD text" });

    // Call FIT_V1 route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be unsuccessful 403 + body has the code "AI_QUOTA_EXCEEDED"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  });

  // Test that the route rejects when application has no job description
  it("rejects when application has no job description", async () => {

    // Create a user with a verified email, no Pro access, and 0 free uses used
    const { userId, token } = await createUserWithState({
      verified: true,
      aiProEnabled: false,
      aiFreeUsesUsed: 0,
    });

    // Create a job application in the database with no job description
    const jobApplicationId = await createApplicationInDb(userId, { description: null });

    // Call FIT_V1 route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be unsuccessful 400 + body has the message "Application is missing a job description."
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: "Application is missing a job description." });

    // No consumption should happen
    const after = await getAiCounters(userId);
    expect(after.aiFreeUsesUsed).toBe(0);
  });

  // Test that the route works for non-pro users under the quota (verified w JD)
  it("allows under quota; creates FIT_V1 artifact; consumes exactly 1 free use; persists fitScore", async () => {
    
    // Create a user with a verified email, no Pro access, and 4 free uses used
    const { userId, token } = await createUserWithState({
      verified: true,
      aiProEnabled: false,
      aiFreeUsesUsed: 4,
    });

    // Create a job application in the database with a job description
    const jdText = "Role: Backend Engineer. Stack: Node, Postgres. Requirements: JWT, APIs.";
    const jobApplicationId = await createApplicationInDb(userId, { description: jdText });

    // Create a base resume doc so the created artifact can return sourceDocumentName.
    const baseDoc = await prisma.document.create({
      data: {
        userId,
        jobApplicationId: null,
        kind: DocumentKind.BASE_RESUME,
        storageKey: `tests/${userId}/base-resume.txt`,
        originalName: "base-resume.txt",
        mimeType: "text/plain",
        size: 123,
        url: null,
      },
      select: { id: true, originalName: true },
    });

    // Mock candidate text extraction (avoid storage/GCS).
    vi.mocked(DocumentsService.getCandidateTextOrThrow).mockResolvedValue({
      text: "Candidate history: Node.js, Fastify, Prisma, Postgres.",
      documentIdUsed: baseDoc.id,
      source: "BASE",
      filename: baseDoc.originalName,
      updatedAt: new Date(),
      mimeType: "text/plain",
    });

    // Mock AI FIT response.
    vi.mocked(AiService.buildFitV1).mockResolvedValue({
      payload: {
        score: 87,
        confidence: "high",
        strengths: ["Node.js APIs", "PostgreSQL"],
        gaps: ["AWS depth"],
        keywordGaps: ["Lambda", "SQS"],
        recommendedEdits: ["Add AWS project bullet"],
        questionsToAsk: ["What is the on-call expectation?"],
      },
      model: "gpt-5-mini",
      tier: "regular",
    });

    // Call FIT_V1 route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be successful 201 + body has the kind "FIT_V1", payload "score" and "confidence", and sourceDocumentName "base-resume.txt"
    expect(res.statusCode).toBe(201);

    // Route contract: returns created artifact + sourceDocumentName
    expect(res.json()).toMatchObject({
      kind: "FIT_V1",
      payload: { score: 87, confidence: "high" },
      sourceDocumentName: "base-resume.txt",
    });

    // Verify services were called with the expected inputs.
    expect(vi.mocked(DocumentsService.getCandidateTextOrThrow)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(AiService.buildFitV1)).toHaveBeenCalledTimes(1);

    const [calledJd, calledCandidate, calledOpts] = vi.mocked(AiService.buildFitV1).mock.calls[0];
    expect(calledOpts).toMatchObject({ tier: expect.any(String) });
    expect(calledJd).toBe(jdText);
    expect(typeof calledCandidate).toBe("string");
    expect(calledCandidate).toContain("Candidate history");

    // Verify DB: artifact created
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId, kind: "FIT_V1" },
    });
    expect(artifact).not.toBeNull();
    expect((artifact as any)?.payload).toMatchObject({ score: 87 });

    // Verify DB: fitScore persisted on application
    const appRow = await prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      select: { fitScore: true, fitUpdatedAt: true },
    });
    expect(appRow?.fitScore).toBe(87);
    expect(appRow?.fitUpdatedAt).not.toBeNull();

    // Verify quota consumption: +1 for non-pro
    const after = await getAiCounters(userId);
    expect(after.aiProEnabled).toBe(false);
    expect(after.aiFreeUsesUsed).toBe(5);
  });

  // Test that the route does not consume free uses when user is Pro
  it("does NOT consume free uses when user is Pro", async () => {

    // Create a user with a verified email, Pro access, and 4 free uses used
    const { userId, token } = await createUserWithState({
      verified: true,
      aiProEnabled: true,
      aiFreeUsesUsed: 4,
    });

    // Create a job application in the database with a job description
    const jobApplicationId = await createApplicationInDb(userId, { description: "JD text" });

    // Mock candidate text extraction (avoid storage/GCS).
    vi.mocked(DocumentsService.getCandidateTextOrThrow).mockResolvedValue({
      text: "Candidate text",
      documentIdUsed: 1,
      source: "BASE",
      filename: "base-resume.txt",
      updatedAt: new Date(),
      mimeType: "text/plain",
    });

    // Mock AI FIT response.
    vi.mocked(AiService.buildFitV1).mockResolvedValue({
      payload: {
        score: 55,
        confidence: "medium",
        strengths: ["One"],
        gaps: ["Two"],
        keywordGaps: [],
        recommendedEdits: [],
        questionsToAsk: [],
      },
      model: "gpt-5-mini",
      tier: "regular",
    });

    // Call FIT_V1 route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Expect the response to be successful 201 + body has the kind "FIT_V1", payload "score" and "confidence", and sourceDocumentName "base-resume.txt"
    expect(res.statusCode).toBe(201);

    // Verify quota consumption: +0 for Pro
    const after = await getAiCounters(userId);
    expect(after.aiProEnabled).toBe(true);
    expect(after.aiFreeUsesUsed).toBe(4); // unchanged
  });

  // Test that the route does not consume free uses when AI service throws
  it("does NOT consume free uses when AI service throws", async () => {
    
    // Create a user with a verified email, no Pro access, and 0 free uses used
    const { userId, token } = await createUserWithState({
      verified: true,
      aiProEnabled: false,
      aiFreeUsesUsed: 0,
    });

    // Create a job application in the database with a job description
    const jobApplicationId = await createApplicationInDb(userId, { description: "JD text" });

    // Mock candidate text extraction (avoid storage/GCS).
    vi.mocked(DocumentsService.getCandidateTextOrThrow).mockResolvedValue({
      text: "Candidate text",
      documentIdUsed: 1,
      source: "BASE",
      filename: "base-resume.txt",
      updatedAt: new Date(),
      mimeType: "text/plain",
    });

    // Mock AI FIT service to throw an error.
    vi.mocked(AiService.buildFitV1).mockRejectedValue(new Error("OpenAI down"));

    // Call FIT_V1 route with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${jobApplicationId}/ai-artifacts`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "FIT_V1" },
    });

    // Current code does not map OpenAI failures here to 502; it bubbles as 500.
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ message: "Internal Server Error" });

    // Verify quota consumption: +0 for non-pro
    const after = await getAiCounters(userId);
    expect(after.aiFreeUsesUsed).toBe(0);

    // Verify DB: artifact not created
    const artifact = await prisma.aiArtifact.findFirst({
      where: { userId, jobApplicationId, kind: "FIT_V1" },
    });
    expect(artifact).toBeNull();
  });
});

// ---------------- Helpers ----------------

function uniqueEmail(prefix = "fit") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function createUserWithState(state: {
  verified: boolean;
  aiProEnabled: boolean;
  aiFreeUsesUsed: number;
}) {
  const email = uniqueEmail();
  const user = await createUser({
    email,
    password: "Passw0rd!",
    isActive: true,
    emailVerifiedAt: state.verified ? new Date() : null,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      aiProEnabled: state.aiProEnabled,
      aiFreeUsesUsed: state.aiFreeUsesUsed,
    },
  });

  const token = signAccessToken({ id: user.id, email: user.email });
  return { userId: user.id, token };
}

async function createApplicationInDb(userId: string, args: { description: string | null }) {
  const created = await prisma.jobApplication.create({
    data: {
      userId,
      company: "Acme",
      position: "Backend Engineer",
      description: args.description,
    },
    select: { id: true },
  });

  return created.id;
}

async function getAiCounters(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProEnabled: true, aiFreeUsesUsed: true },
  });

  if (!user) throw new Error("Test invariant: user should exist");
  return user;
}
