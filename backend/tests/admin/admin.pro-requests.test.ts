import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createUser, signAccessToken } from "../_helpers/factories.js";

// Test suite for admin pro requests functionality
describe("Admin > Pro requests", () => {
  const app: FastifyInstance = buildApp();

  // Before all tests, build the app
  beforeAll(async () => {
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Test that admin users getting pro requests fail when missing Bearer token
  it("GET /api/v1/admin/pro-requests requires Bearer token", async () => {
    
    // Request the pro requests endpoint without a Bearer token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/pro-requests",
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token"
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  // Test that admin users getting pro requests fail when their email is not verified
  it("GET /api/v1/admin/pro-requests blocks unverified users", async () => {

    // Create a user with an unverified email
    const user = await createUser({
      email: "admin-list-unverified@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: null,
    });

    // Sign an access token for the user
    const token = signAccessToken(user);

    // Request the pro requests endpoint with the Bearer token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/pro-requests",
      headers: { authorization: `Bearer ${token}` },
    });

    // Expect the response to be unsuccessful 403 + body has the message "Email not verified"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that admin users getting pro requests fail when they are not an admin
  it("GET /api/v1/admin/pro-requests blocks non-admin users", async () => {

    // Create a user that is not an admin
    const user = await createUser({
      email: "admin-list-nonadmin@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Sign an access token for the user
    const token = signAccessToken(user);

    // Request the pro requests endpoint with the Bearer token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/pro-requests",
      headers: { authorization: `Bearer ${token}` },
    });

    // Expect the response to be unsuccessful 403 + body has the message "Admin forbidden"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "ADMIN_FORBIDDEN" });
  });

  // Test that admin users getting pro requests return items with user info
  it("GET /api/v1/admin/pro-requests returns items with user info for admin", async () => {

    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-list@test.com");

    // Create two users
    const userA = await createUser({
      email: "pro-user-a@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const userB = await createUser({
      email: "pro-user-b@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Create two pro requests from the users
    const req1 = await prisma.aiProRequest.create({
      data: {
        userId: userA.id,
        status: "PENDING",
        requestedAt: new Date(),
        note: "Request A",
      },
      select: { id: true },
    });

    const req2 = await prisma.aiProRequest.create({
      data: {
        userId: userB.id,
        status: "DENIED",
        requestedAt: new Date(),
        decidedAt: new Date(),
        decisionNote: "Denied note",
      },
      select: { id: true },
    });

    // Admin user request the pro requests endpoint with the Bearer token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/pro-requests",
      headers: { authorization: `Bearer ${admin.token}` },
    });

    // Expect the response to be successful 200 + body has the items
    expect(res.statusCode).toBe(200);

    // Expect the body to be an array of items
    const body = res.json() as any;
    expect(Array.isArray(body.items)).toBe(true);

    // Assert both rows are present (sorting can change; IDs are stable).
    const ids = body.items.map((x: any) => x.id);
    expect(ids).toContain(req1.id);
    expect(ids).toContain(req2.id);

    // Expect the item to be the first request
    const item = body.items.find((x: any) => x.id === req1.id);
    expect(item).toMatchObject({
      id: req1.id,
      status: "PENDING",
      note: "Request A",
      user: {
        id: userA.id,
        email: "pro-user-a@test.com",
      },
    });
  });

  // Test that admin users approving pro requests fail when the request is not found
  it("POST /approve -> 404 when request not found", async () => {

    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-approve-404@test.com");

    // Request the approve endpoint with a non-existent request ID
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/pro-requests/not-a-real-id/approve",
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { decisionNote: "ok" },
    });

    // Expect the response to be unsuccessful 404 + body has the message "Request not found"
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: "PRO_REQUEST_NOT_FOUND" });
  });

  // Test that admin users approving pro requests fail when the request is not pending
  it("POST /approve -> 400 when request is not pending", async () => {

    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-approve-notpending@test.com");

    // Create a user
    const user = await createUser({
      email: "approve-notpending-user@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Create a pro request from the user (set to DENIED)
    const reqRow = await prisma.aiProRequest.create({
      data: {
        userId: user.id,
        status: "DENIED",
        requestedAt: new Date(),
        decidedAt: new Date(),
      },
      select: { id: true },
    });

    // Admin user attempt to approve the request with the Bearer token and the request ID
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/pro-requests/${reqRow.id}/approve`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { decisionNote: "Try again later" },
    });

    // Expect the response to be unsuccessful 400 + body has the message "Request is not pending"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "PRO_REQUEST_NOT_PENDING" });
  });

  // Test that admin users approving pro requests succeed when the request is pending
  it("POST /approve -> approves request, enables Pro, records decision note", async () => {

    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-approve-happy@test.com");

    // Create a user
    const user = await createUser({
      email: "approve-happy-user@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Create a pro request from the user
    const reqRow = await prisma.aiProRequest.create({
      data: {
        userId: user.id,
        status: "PENDING",
        requestedAt: new Date(),
        note: "Please approve",
      },
      select: { id: true },
    });

    // Admin user approve the request with the Bearer token and the request ID
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/pro-requests/${reqRow.id}/approve`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { decisionNote: "Approved — good luck!" },
    });

    // Expect the response to be successful 200 + body has the message "ok"
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Confirm user flipped to Pro
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { aiProEnabled: true },
    });
    expect(dbUser?.aiProEnabled).toBe(true);

    // Assert request status updated
    const dbReq = await prisma.aiProRequest.findUnique({
      where: { id: reqRow.id },
      select: { status: true, decidedAt: true, decisionNote: true },
    });
    expect(dbReq?.status).toBe("APPROVED");
    expect(dbReq?.decidedAt).not.toBeNull();
    expect(dbReq?.decisionNote).toBe("Approved — good luck!");
  });

  // Test that admin users denying pro requests succeed when the request is pending
  it("POST /deny -> denies request and records decision note", async () => {

    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-deny-happy@test.com");

    // Create a user
    const user = await createUser({
      email: "deny-happy-user@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Create a pro request from the user
    const reqRow = await prisma.aiProRequest.create({
      data: {
        userId: user.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
      select: { id: true },
    });

    // Admin user deny the request with the Bearer token and the request ID
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/pro-requests/${reqRow.id}/deny`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { decisionNote: "Not at this time" },
    });

    // Expect the response to be successful 200 + body has the message "ok"
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Confirm request status updated
    const dbReq = await prisma.aiProRequest.findUnique({
      where: { id: reqRow.id },
      select: { status: true, decidedAt: true, decisionNote: true },
    });

    expect(dbReq?.status).toBe("DENIED");
    expect(dbReq?.decidedAt).not.toBeNull();
    expect(dbReq?.decisionNote).toBe("Not at this time");

    // Confirm user not flipped to Pro
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { aiProEnabled: true },
    });
    expect(dbUser?.aiProEnabled).toBe(false);
  });

  // Test that admin users granting credits succeed when the request is pending
  it("POST /grant-credits -> resets free uses and marks request as CREDITS_GRANTED", async () => {
    
    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-grant-credits@test.com");

    // Create a user (with 5 free uses used)
    const user = await prisma.user.create({
      data: {
        email: "grant-credits-user@test.com",
        passwordHash: "hash_not_used_in_this_test",
        emailVerifiedAt: new Date(),
        name: "Grant Credits User",
        aiFreeUsesUsed: 5,
      },
      select: { id: true, email: true },
    });

    // Create a pro request from the user
    const reqRow = await prisma.aiProRequest.create({
      data: {
        userId: user.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
      select: { id: true },
    });

    // Admin user grant credits with the Bearer token and the request ID
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/pro-requests/${reqRow.id}/grant-credits`,
      headers: { authorization: `Bearer ${admin.token}` },
    });

    // Expect the response to be successful 200 + body has the message "ok"
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    // Confirm user free uses reset to 0
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { aiFreeUsesUsed: true },
    });
    expect(dbUser?.aiFreeUsesUsed).toBe(0);

    // Confirm request status updated
    const dbReq = await prisma.aiProRequest.findUnique({
      where: { id: reqRow.id },
      select: { status: true, decidedAt: true },
    });
    expect(dbReq?.status).toBe("CREDITS_GRANTED");
    expect(dbReq?.decidedAt).not.toBeNull();
  });

  // Test that admin users approving pro requests fail when the decision note is longer than 500 chars
  it("POST /approve rejects decisionNote longer than 500 chars (schema validation)", async () => {
    
    // Create a verified admin user
    const admin = await createVerifiedAdmin("admin-approve-note-too-long@test.com");
    
    // Create a user
    const user = await createUser({
      email: "note-too-long-user@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });

    // Create a pro request from the user
    const reqRow = await prisma.aiProRequest.create({
      data: {
        userId: user.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
      select: { id: true },
    });

    // Admin user approve the request with the Bearer token and the request ID
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/pro-requests/${reqRow.id}/approve`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { decisionNote: "a".repeat(501) },
    });

    // Expect the response to be unsuccessful 400 + body has the message "Decision note must be less than 500 characters"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: expect.any(String) });
  });
});


// ---------------- Helpers ----------------

// Create a verified admin user
async function createVerifiedAdmin(email: string) {
  const admin = await createUser({
    email,
    password: "Passw0rd!",
    emailVerifiedAt: new Date(),
  });

  // Admin flag is not part of the shared createUser helper, so update it explicitly.
  await prisma.user.update({
    where: { id: admin.id },
    data: { isAdmin: true },
  });

  return { user: admin, token: signAccessToken(admin) };
}
