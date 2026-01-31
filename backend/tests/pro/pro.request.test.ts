import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

// Test suite for pro request functionality
describe("Pro requests", () => {
  let app: FastifyInstance;

  // Before all tests, build the app
  beforeAll(async () => {
    const mod = await import("../../app.js");
    app = mod.buildApp();
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Test that users pro requests fail when missing Bearer token
  it("POST /api/v1/pro/request requires Bearer token", async () => {
    
    // Call the pro request endpoint without a Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      payload: {},
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token"
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: expect.any(String) });
  });

  // Test that users pro requests fail when email is not verified
  it("POST /api/v1/pro/request blocks when email is not verified", async () => {
    
    // Register and login a user (email not verified)
    const { token } = await registerAndLogin(app);

    // Call the pro request endpoint with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Please approve Pro" },
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that users pro requests create a new PENDING request
  it("creates a new PENDING request when verified", async () => {
    
    // Register and login a user
    const { token, userId } = await registerAndLogin(app);

    // Mark the email as verified
    await markEmailVerified(userId);
    
    // Call the pro request endpoint with the Bearer token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Need more AI runs for active interviewing." },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      alreadyPro: false,
      request: {
        id: expect.any(String),
        status: "PENDING",
        requestedAt: expect.any(String),
        decidedAt: null,
      },
    });

    // Confirm the request is created in the database
    const rows = await prisma.aiProRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      take: 1,
    });

    // Expect the request to be created in the database + status to be PENDING + note to be the one provided
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("PENDING");
    expect(rows[0].note).toBe("Need more AI runs for active interviewing.");
  });

  // Test note stored as null when note is whitespace-only
  it("stores null when note is whitespace-only (schema allows minLength=1)", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Call the pro request endpoint with the Bearer token and a whitespace-only note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "   " },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);

    // Confirm the request is created in the database + note is null
    const rows = await prisma.aiProRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      take: 1,
    });

    // Expect the request to be created in the database + note is null
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBeNull();
  });

  // Test users pro requests fail when note is longer than 500 chars
  it("rejects note longer than 500 chars (schema validation)", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Create a note longer than 500 chars
    const longNote = "a".repeat(501);

    // Call the pro request endpoint with the Bearer token and the long note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: longNote },
    });

    // Expect the response to be unsuccessful 400 + body has the message "Note must be less than 500 characters"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: expect.any(String) });

    // Confirm the request is not created in the database
    const count = await prisma.aiProRequest.count({ where: { userId } });
    expect(count).toBe(0);
  });

  // Test users pro requests short-circuit when user is already Pro (no request created)
  it("short-circuits when user is already Pro (no request created)", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Set the user to Pro
    await prisma.user.update({
      where: { id: userId },
      data: { aiProEnabled: true },
    });

    // Call the pro request endpoint with the Bearer token and a note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Should not matter" },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      alreadyPro: true,
      request: null,
    });

    // Confirm the request is not created in the database
    const count = await prisma.aiProRequest.count({ where: { userId } });
    expect(count).toBe(0);
  });

  // Test existing PENDING request is returned during cooldown window (no new request)
  it("returns existing PENDING request during cooldown window (no new request)", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Create a PENDING request
    const existing = await prisma.aiProRequest.create({
      data: {
        userId,
        status: "PENDING",
        requestedAt: daysAgo(1),
        note: "Original request",
      },
    });

    // Call the pro request endpoint with the Bearer token and a note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Second attempt" },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      alreadyPro: false,
      request: { id: existing.id, status: "PENDING" },
    });

    // Confirm the existing request is still in the database (no new request created)
    const count = await prisma.aiProRequest.count({ where: { userId } });
    expect(count).toBe(1);
  });

  // Test upon re-request, stale PENDING request is auto-expired and a fresh one is created
  it("auto-expires stale PENDING request and creates a fresh one", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Create a stale PENDING request (8 days ago)
    const stale = await prisma.aiProRequest.create({
      data: {
        userId,
        status: "PENDING",
        requestedAt: daysAgo(8),
        note: "Stale pending request",
      },
    });

    // Make a second request to the pro request endpoint with the Bearer token and a note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Re-request after cooldown" },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);

    // Get all pro requests for the user
    const all = await prisma.aiProRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: "asc" },
    });

    // Expect both pro requests to be created in the database
    expect(all).toHaveLength(2);

    // Expect the expired request to be expired + the newest request to be PENDING
    const expired = all.find((r) => r.id === stale.id);
    expect(expired?.status).toBe("EXPIRED");
    expect(expired?.decidedAt).not.toBeNull();
    expect(expired?.decisionNote).toBe("Auto-expired (no response). User re-requested.");

    const newest = all[1];
    expect(newest.status).toBe("PENDING");
    expect(newest.id).not.toBe(stale.id);
  });

  // Test existing DENIED request is returned during cooldown window (no new request)
  it("returns existing DENIED request during cooldown window (no new request)", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Create a DENIED request
    const denied = await prisma.aiProRequest.create({
      data: {
        userId,
        status: "DENIED",
        requestedAt: daysAgo(3),
        decidedAt: daysAgo(1),
        decisionNote: "Not at this time",
      },
    });

    // Call the pro request endpoint with the Bearer token and a note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Try again quickly" },
    });

    // Expect the response to be successful 200 + body has the request
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      alreadyPro: false,
      request: { id: denied.id, status: "DENIED" },
    });

    // Confirm no new request was created (cooldown window not elapsed)
    const count = await prisma.aiProRequest.count({ where: { userId } });
    expect(count).toBe(1);
  });

  // Test a new request is created when DENIED cooldown elapsed
  it("creates a new request when DENIED cooldown elapsed", async () => {
    
    // Register and login a user + mark as verified
    const { token, userId } = await registerAndLogin(app);
    await markEmailVerified(userId);

    // Create a DENIED request (20 days ago)
    await prisma.aiProRequest.create({
      data: {
        userId,
        status: "DENIED",
        requestedAt: daysAgo(20),
        decidedAt: daysAgo(15),
        decisionNote: "Denied previously",
      },
    });

    // Make a new pro request endpoint with the Bearer token and a note
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pro/request",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Request after 14-day cooldown" },
    });

    // Expect the response to be successful 200 + body has the request + new request status to be PENDING
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      alreadyPro: false,
      request: { status: "PENDING" },
    });

    // Confirm two pro requests exist in the database
    const count = await prisma.aiProRequest.count({ where: { userId } });
    expect(count).toBe(2);
  });

  // Test succeeds even when OWNER_EMAIL is set but email is not configured
  it("succeeds even when OWNER_EMAIL is set but email is not configured (best-effort)", async () => {
    
    // Set the OWNER_EMAIL environment variable to a test email
    const prev = process.env.OWNER_EMAIL;
    process.env.OWNER_EMAIL = "owner@example.com";

    try {
      // Register and login a user + mark as verified
      const { token, userId } = await registerAndLogin(app);
      await markEmailVerified(userId);

      // With OWNER_EMAIL set, pro.service will attempt sendEmail.
      // lib/email throws if RESEND_API_KEY/EMAIL_FROM missing; pro.service catches and continues.
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/pro/request",
        headers: { authorization: `Bearer ${token}` },
        payload: { note: "Email should be best-effort" },
      });

      // Expect the response to be successful 200 + body has the request
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true, alreadyPro: false });
    } finally {
      process.env.OWNER_EMAIL = prev;
    }
  });
});

// ---------------- Helpers ----------------

async function registerAndLogin(app: FastifyInstance) {
  const email = `pro_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = "Password123!";
  const name = "Test User";

  const reg = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password, name },
  });

  expect(reg.statusCode).toBe(201);

  const body = reg.json() as any;
  const token = body?.token as string;
  const userId = body?.user?.id as string;

  expect(typeof token).toBe("string");
  expect(typeof userId).toBe("string");

  return { email, password, token, userId };
}

async function markEmailVerified(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
