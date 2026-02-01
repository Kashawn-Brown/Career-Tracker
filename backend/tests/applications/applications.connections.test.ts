import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { authHeader, createUser, createVerifiedUser, createApplicationForUser, createConnectionForUser, signAccessToken } from "../_helpers/factories.js";

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

// Test suite for the applications <-> connections routes.
describe("Applications: connections", () => {

  // Test that the GET /applications/:id/connections route requires a Bearer token.
  it("GET /applications/:id/connections requires Bearer token", async () => {
    
    // Request the GET /applications/:id/connections route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications/some-id/connections",
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token".
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  // Test that the POST /applications/:id/connections route is blocked when the user's email is not verified.
  it("blocks when email is not verified (EMAIL_NOT_VERIFIED)", async () => {

    // Create an unverified user.
    const user = await createUser({ email: "unverified@test.com", password: "Password123!" });
    const token = signAccessToken(user);

    // Create an application and connection for the user.
    const appId = await createApplicationForUser(user.id);
    const connectionId = await createConnectionForUser(user.id);

    // Request the POST /applications/:id/connections route with the unverified user's token.
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/connections/${connectionId}`,
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED".
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /applications/:id/connections route attaches a connection, lists it with attachedAt, and detaches it.
  it("attaches connection, lists it with attachedAt, and detaches it", async () => {

    // Create a verified user + application and connection for the user.
    const { user, token } = await createVerifiedUser("owner@test.com", "Password123!");
    const appId = await createApplicationForUser(user.id);
    const connectionId = await createConnectionForUser(user.id);

    // Attach the connection to the application.
    const attach = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/connections/${connectionId}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the ok: true.
    expect(attach.statusCode).toBe(200);
    expect(attach.json()).toMatchObject({ ok: true });

    // List the connections for the application.
    const list1 = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}/connections`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200.
    expect(list1.statusCode).toBe(200);

    // Expect the response body to have the connection.
    const body1 = list1.json() as any;
    expect(Array.isArray(body1.connections)).toBe(true);
    expect(body1.connections).toHaveLength(1);
    expect(body1.connections[0]).toMatchObject({
      id: connectionId,
      name: "Hiring Manager",
    });
    expect(body1.connections[0].attachedAt).toEqual(expect.any(String));

    // Detach the connection from the application.
    const detach = await app.inject({
      method: "DELETE",
      url: `/api/v1/applications/${appId}/connections/${connectionId}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200.
    expect(detach.statusCode).toBe(200);
    expect(detach.json()).toMatchObject({ ok: true });

    // List again (empty)
    const list2 = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}/connections`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the connections: [].
    expect(list2.statusCode).toBe(200);
    expect(list2.json()).toMatchObject({ connections: [] });
  });

  // Test that the POST /applications/:id/connections route is idempotent (does not duplicate rows).
  it("attach is idempotent (does not duplicate rows)", async () => {

    // Create a verified user + application and connection for the user.
    const { user, token } = await createVerifiedUser("idempotent@test.com", "Password123!");
    const appId = await createApplicationForUser(user.id);
    const connectionId = await createConnectionForUser(user.id);

    // Attach the connection to the application.
    const a1 = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/connections/${connectionId}`,
      headers: authHeader(token),
    });
    expect(a1.statusCode).toBe(200);

    // Attempt to attach the same connection to the application again.
    const a2 = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appId}/connections/${connectionId}`,
      headers: authHeader(token),
    });
    expect(a2.statusCode).toBe(200);

    // Expect the count of application connections to still be 1 (did not add a duplicate row).
    const count = await prisma.applicationConnection.count({
      where: { jobApplicationId: appId, connectionId },
    });
    expect(count).toBe(1);
  });

  // Test users cannot access connections of other users' applications.
  it("returns 404 when application is not owned", async () => {

    // Create two verified users.
    const { user: userA, token: tokenA } = await createVerifiedUser("a@test.com", "Password123!");
    const { user: userB } = await createVerifiedUser("b@test.com", "Password123!");

    // Create an application and connection for the second user.
    const appIdOwnedByB = await createApplicationForUser(userB.id);
    const connectionIdOwnedByA = await createConnectionForUser(userA.id);

    // Request the POST /applications/:id/connections route with the first user's token.
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appIdOwnedByB}/connections/${connectionIdOwnedByA}`,
      headers: authHeader(tokenA),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Application not found".
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Application not found" });
  });

  // Test users cannot access connections of other users' applications.
  it("returns 404 when connection is not owned", async () => {

    // Create two verified users.
    const { user: userA, token: tokenA } = await createVerifiedUser("owner-app@test.com", "Password123!");
    const { user: userB } = await createVerifiedUser("owner-conn@test.com", "Password123!");

    // Create an application and connection for the first user.
    const appIdOwnedByA = await createApplicationForUser(userA.id);
    const connectionIdOwnedByB = await createConnectionForUser(userB.id);

    // Request the POST /applications/:id/connections route with the first user's token.
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${appIdOwnedByA}/connections/${connectionIdOwnedByB}`,
      headers: authHeader(tokenA),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Connection not found".
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Connection not found" });
  });
});
