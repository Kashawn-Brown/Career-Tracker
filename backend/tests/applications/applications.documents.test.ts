import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildMultipartSingleFile, createUser, createVerifiedUser, signAccessToken, uniqueEmail } from "../_helpers/factories.js";

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// Test suite for the applications documents routes.
describe("Applications: documents", () => {
  let app: FastifyInstance;
  let prisma: typeof import("../../lib/prisma.js").prisma;

  beforeAll(async () => {
    ({ prisma } = await import("../../lib/prisma.js"));

    const { buildApp } = await import("../../app.js");
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // Test that the GET /applications/:id/documents route requires a Bearer token.
  it("GET /applications/:id/documents requires Bearer token", async () => {

    // Request the GET /applications/:id/documents route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications/does-not-matter/documents",
    });

    // Expect the response to be unsuccessful 401.
    expect(res.statusCode).toBe(401);
  });

  // Test that the GET /applications/:id/documents route returns 404 when not owned.
  it("GET /applications/:id/documents returns 404 when not owned", async () => {

    // Create two verified users.
    const { token: ownerToken } = await createVerifiedUser(uniqueEmail(), "Password123!");
    const { token: otherToken } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create an application under owner.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(ownerToken),
      payload: {
        company: "Acme Corp",
        position: "Backend Dev",
      },
    });

    // Expect the response to be successful 201.
    expect(created.statusCode).toBe(201);

    // Get the id of the created application.
    const appId = created.json().application.id as string;

    // Request the GET /applications/:id/documents route with the other user's token.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}/documents`,
      headers: authHeader(otherToken),
    });

    // Expect the response to be unsuccessful 404 (can't access documents of another user's application).
    expect(res.statusCode).toBe(404);
  });

  // Test that the POST /applications/:id/documents route is blocked when email is not verified.
  it("POST /applications/:id/documents is blocked when email is not verified", async () => {
    
    // Create an unverified user.
    const email = uniqueEmail();
    const user = await createUser({ email, password: "Password123!" });
    const token = signAccessToken(user);

    // Attempt to create an application using unverified user (Will fail with 403, so must create directly with prisma).
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Acme Corp", position: "Backend Dev" },
    });

    // Creating an application is verified-gated in app. Should return 403, so just proceed by creating
    // the application directly with prisma to test documents gating deterministically.
    let appId: string | null = null;

    if (created.statusCode === 201) {
      appId = created.json().application.id;
    } else {
      // Application creation should fail, so create it directly with prisma to test documents gating deterministically.
      const dbApp = await prisma.jobApplication.create({
        data: {
          userId: user.id,
          company: "Acme Corp",
          position: "Backend Dev",
          status: "APPLIED",
        },
        select: { id: true },
      });

      appId = dbApp.id;
    }

    // Build a file.
    const mp = buildMultipartSingleFile({
      fieldName: "file",
      filename: "cover-letter.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Attempt to upload a document using unverified user.
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/documents`,
      headers: {
        ...authHeader(token),
        "content-type": mp.contentType,
      },
      payload: mp.body,
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED".
    expect(upload.statusCode).toBe(403);
    expect(upload.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /applications/:id/documents route uploads a document and GET lists it.
  it("POST /applications/:id/documents uploads; GET lists documents", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser(uniqueEmail(), "Password123!");

    // Create an application under user.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company: "Acme Corp",
        position: "Backend Dev",
      },
    });

    // Expect the response to be successful 201 + get the id.
    expect(created.statusCode).toBe(201);
    const appId = created.json().application.id as string;

    // Build a file.
    const mp = buildMultipartSingleFile({
      fieldName: "file",
      filename: "cover-letter.txt",
      contentType: "text/plain",
      content: "hello",
    });

    // Upload the document to the application.
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/documents`,
      headers: {
        ...authHeader(token),
        "content-type": mp.contentType,
      },
      payload: mp.body,
    });

    // Expect the response to be successful 201 + body has the document.
    expect(upload.statusCode).toBe(201);

    const uploadBody = upload.json();
    expect(uploadBody.document).toMatchObject({
      originalName: "cover-letter.txt",
      mimeType: "text/plain",
      jobApplicationId: appId,
    });

    // List the documents for the application.
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}/documents`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the document.
    expect(list.statusCode).toBe(200);
    const listBody = list.json();

    // Expect the body to be an array with one document.
    expect(Array.isArray(listBody.documents)).toBe(true);
    expect(listBody.documents.length).toBe(1);
    expect(listBody.documents[0]).toMatchObject({
      id: uploadBody.document.id,
      originalName: "cover-letter.txt",
      jobApplicationId: appId,
    });
  });
});
