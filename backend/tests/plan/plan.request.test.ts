/**
 * plan.request.test.ts
 *
 * Tests for the plan credit request system.
 *
 * Coverage:
 *   POST /plan/request
 *     - auth + email verification guards
 *     - creates a PlanRequest record on success
 *     - PRO_PLUS users get alreadyUnlimited: true, no record created
 *     - returns existing request if pending within cooldown
 *     - expires stale pending and creates a fresh one
 *     - enforces declined cooldown window
 *
 *   Admin auto-close on credit actions
 *     - add credits closes open request as APPROVED
 *     - reset credits closes open request as APPROVED
 *     - plan update closes open request as APPROVED
 *     - actions with no open request do not error
 *
 *   POST /admin/users/:userId/requests/:requestId/decline
 *     - auth + admin guards
 *     - declines a pending request
 *     - rejects if request is not pending
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import {
  createUser,
  createVerifiedAdmin,
  createVerifiedUser,
  signAccessToken,
} from "../_helpers/factories.js";


describe("Plan > Credit requests", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });


  // ─────────────────────────────────────────────
  // POST /plan/request — auth guards
  // ─────────────────────────────────────────────

  it("POST /plan/request requires Bearer token", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      payload: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it("POST /plan/request blocks unverified users", async () => {
    const user  = await createUser({ email: "plan-req-unverified@test.com", password: "Passw0rd!" });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });


  // ─────────────────────────────────────────────
  // POST /plan/request — happy path
  // ─────────────────────────────────────────────

  it("POST /plan/request creates a PlanRequest for a REGULAR user", async () => {
    const { user, token } = await createVerifiedUser("plan-req-regular@test.com", "Passw0rd!");

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyUnlimited).toBe(false);
    expect(body.request).toMatchObject({
      id:          expect.any(String),
      status:      "PENDING",
      requestType: "MORE_CREDITS",
    });

    // Verify it was persisted
    const row = await prisma.planRequest.findFirst({ where: { userId: user.id } });
    expect(row).not.toBeNull();
    expect(row!.status).toBe("PENDING");
    expect(row!.requestType).toBe("MORE_CREDITS");
  });

  it("POST /plan/request returns alreadyUnlimited for PRO_PLUS users", async () => {
    const user  = await createUser({
      email:           "plan-req-proplus@test.com",
      password:        "Passw0rd!",
      plan:            "PRO_PLUS",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.alreadyUnlimited).toBe(true);
    expect(body.request).toBeNull();

    // No request should be created
    const count = await prisma.planRequest.count({ where: { userId: user.id } });
    expect(count).toBe(0);
  });

  it("POST /plan/request returns existing request if pending within cooldown", async () => {
    const { user, token } = await createVerifiedUser("plan-req-cooldown@test.com", "Passw0rd!");

    // Create a recent pending request
    const existing = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    // Should return the existing request, not create a new one
    const body = res.json();
    expect(body.request.id).toBe(existing.id);

    const count = await prisma.planRequest.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it("POST /plan/request expires a stale pending request and creates a fresh one", async () => {
    const { user, token } = await createVerifiedUser("plan-req-stale@test.com", "Passw0rd!");

    // Create a pending request that is older than the cooldown window (3 days)
    const staleDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
        requestedAt:  staleDate,
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    const all = await prisma.planRequest.findMany({
      where:   { userId: user.id },
      orderBy: { requestedAt: "asc" },
    });

    // Two rows: the old one (now DECLINED/expired) and the new PENDING one
    expect(all).toHaveLength(2);
    expect(all[0].status).toBe("DECLINED");
    expect(all[1].status).toBe("PENDING");
  });

  it("POST /plan/request enforces declined cooldown window", async () => {
    const { user, token } = await createVerifiedUser("plan-req-denied-cooldown@test.com", "Passw0rd!");

    // Create a recently declined request (within 7-day cooldown)
    await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "DECLINED",
        decidedAt:    new Date(),
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/plan/request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    // Should return the declined request, not create a new one
    const count = await prisma.planRequest.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });


  // ─────────────────────────────────────────────
  // Admin auto-close on credit actions
  // ─────────────────────────────────────────────

  it("POST /admin/users/:userId/credits/add closes an open request as APPROVED", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-autoclose-add-admin@test.com");
    const { user }              = await createVerifiedUser("plan-autoclose-add-user@test.com", "Passw0rd!");

    const request = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/credits/add`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { credits: 50 },
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.planRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
    expect(updated!.decidedAt).not.toBeNull();
  });

  it("POST /admin/users/:userId/credits/reset closes an open request as APPROVED", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-autoclose-reset-admin@test.com");
    const { user }              = await createVerifiedUser("plan-autoclose-reset-user@test.com", "Passw0rd!");

    const request = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/credits/reset`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.planRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
  });

  it("PATCH /admin/users/:userId/plan closes an open request as APPROVED", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-autoclose-plan-admin@test.com");
    const { user }              = await createVerifiedUser("plan-autoclose-plan-user@test.com", "Passw0rd!");

    const request = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
      },
    });

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${user.id}/plan`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.planRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
  });

  it("Admin credit actions succeed even when user has no open request", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-autoclose-none-admin@test.com");
    const { user }              = await createVerifiedUser("plan-autoclose-none-user@test.com", "Passw0rd!");

    // No pending request exists — should not throw
    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/credits/add`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { credits: 25 },
    });

    expect(res.statusCode).toBe(200);
  });


  // ─────────────────────────────────────────────
  // POST /admin/users/:userId/requests/:requestId/decline
  // ─────────────────────────────────────────────

  it("POST decline requires Bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url:    "/api/v1/admin/users/fake-user/requests/fake-req/decline",
    });

    expect(res.statusCode).toBe(401);
  });

  it("POST decline blocks non-admin users", async () => {
    const { user, token } = await createVerifiedUser("plan-decline-nonadmin@test.com", "Passw0rd!");

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/requests/fake-req/decline`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("POST decline sets request status to DECLINED", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-decline-admin@test.com");
    const { user }              = await createVerifiedUser("plan-decline-user@test.com", "Passw0rd!");

    const request = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "PENDING",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/requests/${request.id}/decline`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    const updated = await prisma.planRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("DECLINED");
    expect(updated!.decidedAt).not.toBeNull();
  });

  it("POST decline returns 400 if request is not pending", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-decline-notpending-admin@test.com");
    const { user }              = await createVerifiedUser("plan-decline-notpending-user@test.com", "Passw0rd!");

    const request = await prisma.planRequest.create({
      data: {
        userId:       user.id,
        requestType:  "MORE_CREDITS",
        planAtRequest: "REGULAR",
        status:       "APPROVED",
      },
    });

    const res = await app.inject({
      method:  "POST",
      url:     `/api/v1/admin/users/${user.id}/requests/${request.id}/decline`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST decline returns 404 for unknown request", async () => {
    const { token: adminToken } = await createVerifiedAdmin("plan-decline-404-admin@test.com");

    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/admin/users/fake-user/requests/nonexistent-id/decline",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

});