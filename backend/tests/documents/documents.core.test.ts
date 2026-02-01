import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import * as Storage from "../../lib/storage.js";

import { authHeader, createUser, createVerifiedUser, signAccessToken, uniqueEmail } from "../_helpers/factories.js";

// Test suite for the documents core routes.
describe("Documents core (by id)", () => {
  let app: FastifyInstance;

  // Before all tests, build the app.
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  // After all tests, close the app.
  afterAll(async () => {
    await app.close();
  });

  // Before each test, clear all mocks.
  beforeEach(() => {
    // Keep mock call assertions deterministic.
    vi.clearAllMocks();
  });

  // Test that the GET /documents/:id/download route requires a Bearer token.
  it("GET /documents/:id/download requires Bearer token", async () => {
    
    // Request the GET /documents/:id/download route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/documents/123/download",
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token".
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      message: "Missing Bearer token",
      code: "UNAUTHORIZED",
    });
  });

  // Test that the document download route is blocked when the user's email is not verified.
  it("GET /documents/:id/download is blocked when email is not verified", async () => {
    
    // Create an unverified user.
    const email = uniqueEmail();
    const user = await createUser({ email, password: "Password123!" });
    const token = signAccessToken(user);

    // Create a document owned by this unverified user.
    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        kind: "OTHER",
        storageKey: "test-storage-key-unverified",
        originalName: "unverified.txt",
        mimeType: "text/plain",
        size: 5,
      },
      select: { id: true },
    });

    // Request the GET /documents/:id/download route with the unverified user's token.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/documents/${doc.id}/download`,
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 403 + body has the message "Email not verified" and code "EMAIL_NOT_VERIFIED".
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      message: "Email not verified",
      code: "EMAIL_NOT_VERIFIED",
    });
  });

  // Test that the document download route returns 404 when the document is not owned by the user.
  it("GET /documents/:id/download returns 404 when document is not owned", async () => {
    
    // Create two verified users.
    const { user: owner } = await createVerifiedUser(uniqueEmail(), "Password123!");
    const { token: otherToken } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create a document owned by the owner user.
    const doc = await prisma.document.create({
      data: {
        userId: owner.id,
        kind: "OTHER",
        storageKey: "test-storage-key-not-owned",
        originalName: "private.pdf",
        mimeType: "application/pdf",
        size: 123,
      },
      select: { id: true },
    });

    // Other user attempts to download the document.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/documents/${doc.id}/download`,
      headers: authHeader(otherToken),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Document not found.".
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Document not found." });
  });

  // Test that the document download route returns a signed URL and passes the disposition through.
  it("GET /documents/:id/download returns signed url and passes disposition through", async () => {
    
    // Create a verified user.
    const { user, token } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create a document owned by the user.
    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        kind: "OTHER",
        storageKey: "test-storage-key-download",
        originalName: "resume.pdf",
        mimeType: "application/pdf",
        size: 999,
      },
      select: { id: true },
    });

    // Request to download the document with the disposition set to "attachment".
    const res = await app.inject({
      method: "GET",
      // Verify query plumbing: disposition should be forwarded to getSignedReadUrl.
      url: `/api/v1/documents/${doc.id}/download?disposition=attachment`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the downloadUrl.
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      downloadUrl: expect.any(String),
    });

    // Expect the getSignedReadUrl function to have been called once.
    const getSignedReadUrlMock = vi.mocked(Storage.getSignedReadUrl);
    expect(getSignedReadUrlMock).toHaveBeenCalledTimes(1);

    // Assert the correct arguments were used to build the signed URL.
    expect(getSignedReadUrlMock.mock.calls[0]?.[0]).toMatchObject({
      storageKey: "test-storage-key-download",
      filename: "resume.pdf",
      disposition: "attachment",
    });
  });

  // Test that the DELETE /documents/:id route deletes the DB row and deletes the GCS object.
  it("DELETE /documents/:id deletes DB row and deletes GCS object", async () => {
    
    // Create a verified user.
    const { user, token } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create a document owned by the user.
    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        kind: "OTHER",
        storageKey: "test-storage-key-delete",
        originalName: "delete-me.txt",
        mimeType: "text/plain",
        size: 10,
      },
      select: { id: true },
    });

    // Request to delete the document.
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/documents/${doc.id}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the ok: true.
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ ok: true });

    // Confirm DB row is gone.
    const stillThere = await prisma.document.findUnique({
      where: { id: doc.id },
      select: { id: true },
    });
    expect(stillThere).toBeNull();

    // Confirm storage deletion was called with the right key.
    const deleteGcsObjectMock = vi.mocked(Storage.deleteGcsObject);
    expect(deleteGcsObjectMock).toHaveBeenCalledTimes(1);
    expect(deleteGcsObjectMock).toHaveBeenCalledWith("test-storage-key-delete");

    // Download should now 404.
    const dlAfter = await app.inject({
      method: "GET",
      url: `/api/v1/documents/${doc.id}/download`,
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Document not found.".
    expect(dlAfter.statusCode).toBe(404);
    expect(dlAfter.json()).toMatchObject({ message: "Document not found." });
  });

  // Test that the DELETE /documents/:id route returns 404 when the document is not owned by the user.
  it("DELETE /documents/:id returns 404 when document is not owned", async () => {
    
    // Create two verified users.
    const { user: owner } = await createVerifiedUser(uniqueEmail(), "Password123!");
    const { token: otherToken } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create a document owned by the owner user.
    const doc = await prisma.document.create({
      data: {
        userId: owner.id,
        kind: "OTHER",
        storageKey: "test-storage-key-delete-not-owned",
        originalName: "private-delete.pdf",
        mimeType: "application/pdf",
        size: 1,
      },
      select: { id: true },
    });

    // Other user attempts to delete the document.
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/documents/${doc.id}`,
      headers: authHeader(otherToken),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Document not found.".
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Document not found." });
  });
});
