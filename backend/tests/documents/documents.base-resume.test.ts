import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createUser, createVerifiedUser, signAccessToken, uniqueEmail } from "../_helpers/factories.js";

/**
 * Mock only the GCS operations (upload/delete/signed-url).
 * Keep the rest of storage logic real (e.g., mime checks).
 */
vi.mock("../../lib/storage.js", async () => {
  const actual = await vi.importActual<any>("../../lib/storage.js");
  return {
    ...actual,
    uploadStreamToGcs: vi.fn(async () => ({ sizeBytes: 123 })),
    getSignedReadUrl: vi.fn(async () => "https://signed.example/base-resume"),
    deleteGcsObject: vi.fn(async () => undefined),
  };
});


// Test suite for the base resume document endpoints.
describe("Documents: base resume", () => {
  let app: FastifyInstance;
  let prisma: typeof import("../../lib/prisma.js").prisma;
  let Storage: typeof import("../../lib/storage.js");

  beforeAll(async () => {
    ({ prisma } = await import("../../lib/prisma.js"));
    Storage = await import("../../lib/storage.js");

    const { buildApp } = await import("../../app.js");
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test that the GET /documents/base-resume route requires a Bearer token.
  it("GET /documents/base-resume requires Bearer token", async () => {
    // Request the GET /documents/base-resume route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/documents/base-resume",
    });

    // Expect the response to be unsuccessful 401.
    expect(res.statusCode).toBe(401);
  });

  // Test that the GET /documents/base-resume route returns null when the user has no base resume.
  it("GET /documents/base-resume returns null when user has no base resume", async () => {
    
    // Create a verified user.
    const email = uniqueEmail();
    const { token } = await createVerifiedUser(email, "Password123!");

    // Request the GET /documents/base-resume route with the verified user's token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/documents/base-resume",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has null baseResume.
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ baseResume: null });
  });

  // Test that the POST /documents/base-resume route is blocked when the user isn't verified.
  it("POST /documents/base-resume is blocked when email is not verified", async () => {
    
    // Create an unverified user.
    const email = uniqueEmail();
    const user = await createUser({ email, password: "Password123!" });
    const token = signAccessToken(user);

    // Build a file.
    const mp = buildMultipartSingleFile({
      fieldName: "file",
      filename: "resume.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Attempt to upload file as users base resume.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/documents/base-resume",
      headers: {
        ...authHeader(token),
        "content-type": mp.contentType,
      },
      payload: mp.body,
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED".
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /documents/base-resume route uploads a base resume, GET returns the base resume, and download returns a signed url.
  it("POST /documents/base-resume uploads; GET returns baseResume; download returns signed url", async () => {
    
    // Create a verified user.
    const email = uniqueEmail();
    const { token } = await createVerifiedUser(email, "Password123!");

    // Build a file.
    const mp = buildMultipartSingleFile({
      fieldName: "file",
      filename: "resume.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Upload file as users base resume.
    const upload = await app.inject({
      method: "POST",
      url: "/api/v1/documents/base-resume",
      headers: {
        ...authHeader(token),
        "content-type": mp.contentType,
      },
      payload: mp.body,
    });

    // Expect the response to be successful 201 + body has the base resume.
    expect(upload.statusCode).toBe(201);
    const uploadBody = upload.json();
    expect(uploadBody.baseResume).toMatchObject({
      kind: "BASE_RESUME",
      originalName: "resume.txt",
      mimeType: "text/plain",
    });

    // Get the id of the uploaded base resume.
    const baseResumeId = uploadBody.baseResume.id as string;

    // Request the GET /documents/base-resume route with the verified user's token.
    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/documents/base-resume",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the base resume with the same id.
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.baseResume.id).toBe(baseResumeId);

    // Download the base resume.
    const dl = await app.inject({
      method: "GET",
      url: "/api/v1/documents/base-resume/download",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the signed url.
    expect(dl.statusCode).toBe(200);
    expect(dl.json()).toEqual({ downloadUrl: "https://signed.example/base-resume" });

    // Expect the getSignedReadUrl function to have been called once.
    const getSignedReadUrlMock = vi.mocked(Storage.getSignedReadUrl);
    expect(getSignedReadUrlMock).toHaveBeenCalledTimes(1);

    const callArgs = getSignedReadUrlMock.mock.calls[0]?.[0];
    expect(callArgs).toMatchObject({
      disposition: "inline",
      filename: "resume.txt",
    });
    expect(typeof callArgs.storageKey).toBe("string");
  });

  // Test that uploading a new base resume replaces the old one and deletes the old GCS key if different.
  it("Uploading a new base resume replaces the old one; old GCS key is deleted if different", async () => {
    
    // Create a verified user.
    const email = uniqueEmail();
    const { token } = await createVerifiedUser(email, "Password123!");

    // Build a file.
    const mp1 = buildMultipartSingleFile({
      fieldName: "file",
      filename: "resume.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Upload first file as users base resume.
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/documents/base-resume",
      headers: {
        ...authHeader(token),
        "content-type": mp1.contentType,
      },
      payload: mp1.body,
    });

    // Expect the response to be successful 201 + body has the base resume.
    expect(first.statusCode).toBe(201);

    // Get the first base resume document.
    const firstDoc = await prisma.document.findFirst({
      where: { kind: "BASE_RESUME" },
      select: { storageKey: true },
    });

    // Expect the first base resume document to have a storage key.
    expect(firstDoc?.storageKey).toBeTruthy();

    // Build a second file.
    const mp2 = buildMultipartSingleFile({
      fieldName: "file",
      filename: "resume.pdf",
      contentType: "application/pdf",
      content: Buffer.from("%PDF-1.4 fake"),
    });

    // Upload second file as users base resume.
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/documents/base-resume",
      headers: {
        ...authHeader(token),
        "content-type": mp2.contentType,
      },
      payload: mp2.body,
    });

    // Expect the response to be successful 201 + body has the base resume.
    expect(second.statusCode).toBe(201);

    // Get all base resume documents for the user.
    const docs = await prisma.document.findMany({
      where: { kind: "BASE_RESUME" },
      select: { id: true, storageKey: true },
    });

    // Expect only one base resume per user (service deletes old rows).
    expect(docs).toHaveLength(1);

    // Get the deleteGcsObject mock.
    const deleteGcsObjectMock = vi.mocked(Storage.deleteGcsObject);

    // Expect the old key should be deleted when the new key differs (txt -> pdf).
    expect(deleteGcsObjectMock).toHaveBeenCalledWith(firstDoc!.storageKey);
  });

  // Test that the DELETE /documents/base-resume route returns 404 when the user has no base resume.
  it("DELETE /documents/base-resume returns 404 when none exists", async () => {
    
    // Create a verified user.
    const email = uniqueEmail();
    const { token } = await createVerifiedUser(email, "Password123!");

    // Attempt to delete the users base resume.
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/documents/base-resume",
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 404 (Base resume doesn't exist).
    expect(res.statusCode).toBe(404);
  });

  // Test that the DELETE /documents/base-resume route deletes the base resume and the GCS object.
  it("DELETE /documents/base-resume deletes doc and deletes GCS object", async () => {
    
    // Create a verified user.
    const email = uniqueEmail();
    const { token } = await createVerifiedUser(email, "Password123!");

    // Build a file.
    const mp = buildMultipartSingleFile({
      fieldName: "file",
      filename: "resume.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Upload file as users base resume.
    const upload = await app.inject({
      method: "POST",
      url: "/api/v1/documents/base-resume",
      headers: {
        ...authHeader(token),
        "content-type": mp.contentType,
      },
      payload: mp.body,
    });

    // Expect the response to be successful 201
    expect(upload.statusCode).toBe(201);

    // Get the existing base resume document.
    const existing = await prisma.document.findFirst({
      where: { kind: "BASE_RESUME" },
      select: { storageKey: true },
    });

    // Delete the users base resume.
    const del = await app.inject({
      method: "DELETE",
      url: "/api/v1/documents/base-resume",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + ok: true.
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ ok: true });

    // Get the number of base resume documents after deletion ; Expect 0.
    const after = await prisma.document.count({ where: { kind: "BASE_RESUME" } });
    expect(after).toBe(0);

    // Get the deleteGcsObject mock.
    const deleteGcsObjectMock = vi.mocked(Storage.deleteGcsObject);
    expect(deleteGcsObjectMock).toHaveBeenCalledWith(existing!.storageKey);
  });
});

// ------------------ HELPER FUNCTIONS ------------------

// Helper function to build the authorization header.
function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// Helper function to build a multipart/form-data single file.
function buildMultipartSingleFile(args: {
  fieldName: string;
  filename: string;
  contentType: string;
  content: Buffer | string;
}) {
  const boundary = `----career-tracker-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${args.fieldName}"; filename="${args.filename}"\r\n` +
    `Content-Type: ${args.contentType}\r\n\r\n`;

  const tail = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(head),
    Buffer.isBuffer(args.content) ? args.content : Buffer.from(args.content),
    Buffer.from(tail),
  ]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}