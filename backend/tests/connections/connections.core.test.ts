import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { createUser, createVerifiedUser, signAccessToken, uniqueEmail } from "../_helpers/factories.js";
import { authHeader, getCookieValueFromSetCookie } from "../_helpers/http.js";
import { prisma } from "../../lib/prisma.js";

// Test suite for the connections core routes.
describe("Connections core", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // Test that the GET /connections route requires a Bearer token.
  it("GET /connections requires Bearer token", async () => {
    // Request the GET /connections route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/connections",
    });

    // Expect the response to be unsuccessful 401.
    expect(res.statusCode).toBe(401);
  });

  // Test that the POST /connections route is blocked when the user's email is not verified.
  it("POST /connections is blocked when email is not verified", async () => {
    // Create an unverified user.
    const user = await createUser({ email: uniqueEmail(), password: "Password123!" });
    const token = signAccessToken(user);

    // Request the POST /connections route with the unverified user's token.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "John Doe" },
    });

    // Expect the response to be unsuccessful 403.
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /connections route creates a connection and normalizes whitespace-only fields to null.
  it("POST /connections creates connection and normalizes whitespace-only fields to null", async () => {
    // Create a verified user.
    const { user, token } = await createVerifiedUser( uniqueEmail(), "Password123!" );

    // Create a connection for the user.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: {
        name: "  John Doe  ",
        company: "   ",
        title: "  Recruiter ",
        email: "  john@example.com  ",
        linkedInUrl: "   ",
        notes: "  hello  ",
        phone: "   ",
        relationship: "  recruiter  ",
        location: "   ",
      },
    });

    // Expect the response to be successful 201.
    expect(res.statusCode).toBe(201);

    // Expect the response body to have the created connection (empty fields normalized to null).
    const body = res.json();
    expect(body.connection).toMatchObject({
      name: "John Doe",
      company: null,
      title: "Recruiter",
      email: "john@example.com",
      linkedInUrl: null,
      notes: "hello",
      phone: null,
      relationship: "recruiter",
      location: null,
      status: null,
    });

    expect(typeof body.connection.id).toBe("string");
  });

  // Test that the GET /connections route returns the default values (page=1, pageSize=20, sortBy=name, sortDir=desc).
  it("GET /connections returns defaults (page=1, pageSize=10, sortBy=name, sortDir=desc)", async () => {
    // Create a verified user.
    const { token } = await createVerifiedUser( uniqueEmail(), "Password123!" );

    // Create 3 connections with different names to verify default sort is name desc.
    await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "Alice" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "Bob" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "Charlie" },
    });

    // Request the GET /connections route with the user's token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/connections",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200.
    expect(res.statusCode).toBe(200);

    // Expect the response body to have the default values (page=1, pageSize=20, sortBy=name, sortDir=desc).
    const body = res.json();
    expect(body).toMatchObject({
      total: 3,
      page: 1,
      pageSize: 20,
    });

    // Expect the response body to have the connections sorted by name descending.
    const names = body.items.map((c: any) => c.name);
    expect(names).toEqual(["Charlie", "Bob", "Alice"]);
  });

  // Test that the GET /connections/:id route returns 404 when the connection is not owned by the user.
  it("GET /connections/:id returns 404 when not owned", async () => {
    // Create two verified users.
    const { token: ownerToken } = await createVerifiedUser( uniqueEmail(), "Password123!" );
    const { token: otherToken } = await createVerifiedUser( uniqueEmail(), "Password123!" );

    // Create a connection for the owner.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(ownerToken),
      payload: { name: "Owner Connection" },
    });

    // Expect the response to be successful 201 + get the connection id.
    expect(created.statusCode).toBe(201);
    const connectionId = created.json().connection.id as string;

    // Request the created connectionroute with the other user's token.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/connections/${connectionId}`,
      headers: authHeader(otherToken),
    });

    // Expect the response to be unsuccessful 404 (NOT_FOUND).
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: "NOT_FOUND" });
  });

  // Test updating a users connections.
  it("PATCH /connections/:id updates and normalizes fields", async () => {
    // Create a verified user.
    const { user, token } = await createVerifiedUser( uniqueEmail(), "Password123!" );

    // Create a connection for the user.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "  John  ", company: "Acme" },
    });

    // Get the connection id.
    const connectionId = created.json().connection.id as string;

    // Update the connection.
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/connections/${connectionId}`,
      headers: authHeader(token),
      payload: {
        company: "   ", // whitespace-only => null
        title: "  Senior Recruiter ",
        status: true,
      },
    });

    // Expect the response to be successful 200.
    expect(updated.statusCode).toBe(200);

    // Expect the response body to have the updated connection values.
    const body = updated.json();
    expect(body.connection).toMatchObject({
      id: connectionId,
      name: "John",
      company: null,
      title: "Senior Recruiter",
      status: true,
    });
  });

  // Test deleting a users connections.
  it("DELETE /connections/:id deletes connection and returns ok:true", async () => {
    // Create a verified user.
    const { token } = await createVerifiedUser( uniqueEmail(), "Password123!" );

    // Create a connection for the user.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/connections",
      headers: authHeader(token),
      payload: { name: "To Delete" },
    });

    // Get the connection id.
    const connectionId = created.json().connection.id as string;

    // Delete the connection.
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/connections/${connectionId}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200.
    expect(del.statusCode).toBe(200);
    expect(del.json()).toMatchObject({ ok: true });

    // Request the deleted connection route with the user's token.
    const getAfter = await app.inject({
      method: "GET",
      url: `/api/v1/connections/${connectionId}`,
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 404 (NOT_FOUND).
    expect(getAfter.statusCode).toBe(404);
    expect(getAfter.json()).toMatchObject({ code: "NOT_FOUND" });

    // Extra safety: confirm DB is actually gone.
    const inDb = await prisma.connection.findUnique({ where: { id: connectionId } });
    expect(inDb).toBeNull();
  });
});
