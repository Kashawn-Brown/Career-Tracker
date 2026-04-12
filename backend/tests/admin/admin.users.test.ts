import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createUser, createVerifiedAdmin, signAccessToken } from "../_helpers/factories.js";

// Test suite for admin user management endpoints:
//   GET  /admin/users               — list users
//   GET  /admin/users/:userId       — user detail with stats
//   PATCH /admin/users/:userId/plan — update plan
//   PATCH /admin/users/:userId/status — activate / deactivate
describe("Admin > Users", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });


  // ─────────────────────────────────────────────
  // GET /admin/users
  // ─────────────────────────────────────────────

  it("GET /admin/users requires Bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/admin/users" });

    expect(res.statusCode).toBe(401);
  });

  it("GET /admin/users blocks unverified users", async () => {
    // Unverified user (no emailVerifiedAt)
    const user  = await createUser({ email: "admin-users-unverified@test.com", password: "Passw0rd!" });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("GET /admin/users blocks non-admin users", async () => {
    const user = await createUser({
      email:          "admin-users-nonadmin@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "ADMIN_FORBIDDEN" });
  });

  it("GET /admin/users returns paginated list with expected shape", async () => {
    const { token } = await createVerifiedAdmin("admin-users-list@test.com");

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("pageSize");
    expect(body).toHaveProperty("totalPages");
    expect(Array.isArray(body.items)).toBe(true);

    // Verify the shape of each returned item
    if (body.items.length > 0) {
      expect(body.items[0]).toMatchObject({
        id:             expect.any(String),
        email:          expect.any(String),
        name:           expect.any(String),
        role:           expect.any(String),
        plan:           expect.any(String),
        isActive:       expect.any(Boolean),
      });
    }
  });

  it("GET /admin/users includes admin users in the list", async () => {
    // Admins should appear in the list (not filtered out server-side)
    const { token } = await createVerifiedAdmin("admin-users-includes-admin@test.com");

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    const adminItems = body.items.filter((u: any) => u.role === "ADMIN");

    // The admin we just created should appear in the list
    expect(adminItems.length).toBeGreaterThan(0);
  });

  it("GET /admin/users filters by plan", async () => {
    const { token } = await createVerifiedAdmin("admin-users-filter-plan@test.com");

    // Create a PRO user to filter for
    await createUser({
      email:          "admin-users-pro-target@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      plan:           "PRO",
    });

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users?plan=PRO",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    // Every item in the filtered result should be PRO
    expect(body.items.every((u: any) => u.plan === "PRO")).toBe(true);
  });

  it("GET /admin/users filters by search query (name/email)", async () => {
    const { token } = await createVerifiedAdmin("admin-users-filter-q@test.com");

    // Create a user with a unique name to search for
    const uniqueName = `UniqueSearchTarget-${Date.now()}`;
    await createUser({
      email:          `search-target-${Date.now()}@test.com`,
      password:       "Passw0rd!",
      name:           uniqueName,
      emailVerifiedAt: new Date(),
    });

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/admin/users?q=${encodeURIComponent(uniqueName)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((u: any) =>
      u.name.includes(uniqueName) || u.email.includes(uniqueName)
    )).toBe(true);
  });


  // ─────────────────────────────────────────────
  // GET /admin/users/:userId  (detail)
  // ─────────────────────────────────────────────

  it("GET /admin/users/:userId requires Bearer token", async () => {
    const res = await app.inject({
      method: "GET",
      url:    "/api/v1/admin/users/some-id",
    });

    expect(res.statusCode).toBe(401);
  });

  it("GET /admin/users/:userId blocks non-admin users", async () => {
    const user = await createUser({
      email:          "detail-nonadmin@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("GET /admin/users/:userId returns 404 for unknown user", async () => {
    const { token } = await createVerifiedAdmin("detail-404@test.com");

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/admin/users/nonexistent-id",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /admin/users/:userId returns user detail with activity stats", async () => {
    const { token } = await createVerifiedAdmin("detail-happy@test.com");

    // Create a target user with some activity
    const target = await createUser({
      email:          "detail-target@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      plan:           "PRO",
    });

    // Give them an application so stats are non-zero
    await prisma.jobApplication.create({
      data: { userId: target.id, company: "Acme", position: "Engineer" },
    });

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/admin/users/${target.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();

    // Core user fields
    expect(body).toMatchObject({
      id:             target.id,
      email:          "detail-target@test.com",
      role:           "USER",
      plan:           "PRO",
      isActive:       true,
    });

    // Activity stats
    expect(body).toHaveProperty("applicationCount");
    expect(body).toHaveProperty("connectionCount");
    expect(body).toHaveProperty("statusBreakdown");
    expect(body.applicationCount).toBe(1);
    expect(body.connectionCount).toBe(0);
    expect(typeof body.statusBreakdown).toBe("object");
  });


  // ─────────────────────────────────────────────
  // PATCH /admin/users/:userId/plan
  // ─────────────────────────────────────────────

  it("PATCH /admin/users/:userId/plan requires Bearer token", async () => {
    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/some-id/plan",
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("PATCH /admin/users/:userId/plan blocks non-admin users", async () => {
    const user = await createUser({
      email:          "plan-nonadmin@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${user.id}/plan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("PATCH /admin/users/:userId/plan updates plan successfully", async () => {
    const { token } = await createVerifiedAdmin("plan-update@test.com");

    const target = await createUser({
      email:          "plan-target@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      plan:           "REGULAR",
    });

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${target.id}/plan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Confirm the DB was updated
    const dbUser = await prisma.user.findUnique({
      where:  { id: target.id },
      select: { plan: true },
    });
    expect(dbUser?.plan).toBe("PRO");
  });

  it("PATCH /admin/users/:userId/plan returns 404 for unknown user", async () => {
    const { token } = await createVerifiedAdmin("plan-404@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/nonexistent-id/plan",
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /admin/users/:userId/plan rejects invalid plan value", async () => {
    const { token } = await createVerifiedAdmin("plan-invalid@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/some-id/plan",
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "INVALID_PLAN" },
    });

    expect(res.statusCode).toBe(400);
  });


  // ─────────────────────────────────────────────
  // PATCH /admin/users/:userId/status
  // ─────────────────────────────────────────────

  it("PATCH /admin/users/:userId/status requires Bearer token", async () => {
    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/some-id/status",
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(401);
  });

  it("PATCH /admin/users/:userId/status blocks non-admin users", async () => {
    const user = await createUser({
      email:          "status-nonadmin@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${user.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(403);
  });

  it("PATCH /admin/users/:userId/status deactivates a user successfully", async () => {
    const { token } = await createVerifiedAdmin("status-deactivate@test.com");

    const target = await createUser({
      email:          "status-target-active@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      isActive:       true,
    });

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${target.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Confirm the DB was updated
    const dbUser = await prisma.user.findUnique({
      where:  { id: target.id },
      select: { isActive: true },
    });
    expect(dbUser?.isActive).toBe(false);
  });

  it("PATCH /admin/users/:userId/status reactivates a user successfully", async () => {
    const { token } = await createVerifiedAdmin("status-reactivate@test.com");

    const target = await createUser({
      email:          "status-target-inactive@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      isActive:       false,
    });

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${target.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: true },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Confirm the DB was updated
    const dbUser = await prisma.user.findUnique({
      where:  { id: target.id },
      select: { isActive: true },
    });
    expect(dbUser?.isActive).toBe(true);
  });

  it("PATCH /admin/users/:userId/status cannot deactivate an admin account", async () => {
    // Admin accounts are protected — another admin cannot deactivate them
    const { token }   = await createVerifiedAdmin("status-protect-actor@test.com");
    const { user: adminTarget } = await createVerifiedAdmin("status-protect-target@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     `/api/v1/admin/users/${adminTarget.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "ADMIN_PROTECTED" });
  });

  it("PATCH /admin/users/:userId/status returns 404 for unknown user", async () => {
    const { token } = await createVerifiedAdmin("status-404@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/nonexistent-id/status",
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /admin/users/:userId/status rejects missing isActive field", async () => {
    const { token } = await createVerifiedAdmin("status-invalid@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/some-id/status",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });
});