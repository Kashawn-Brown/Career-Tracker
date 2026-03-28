import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createUser, createVerifiedAdmin, signAccessToken } from "../_helpers/factories.js";

describe("Admin > Users", () => {
  const app: FastifyInstance = buildApp();

  beforeAll(async () => { await app.ready(); });
  afterAll(async ()  => { await app.close(); });


  // --- GET /admin/users ---

  it("GET /admin/users requires Bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/admin/users" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /admin/users blocks unverified users", async () => {
    const user  = await createUser({ email: "admin-users-unverified@test.com", password: "Passw0rd!" });
    const token = signAccessToken(user);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("GET /admin/users blocks non-admin users", async () => {
    const user = await createUser({
      email: "admin-users-nonadmin@test.com",
      password: "Passw0rd!",
      emailVerifiedAt: new Date(),
    });
    const token = signAccessToken(user);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "ADMIN_FORBIDDEN" });
  });

  it("GET /admin/users returns paginated user list for admin", async () => {
    const { token } = await createVerifiedAdmin("admin-users-list@test.com");

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.items)).toBe(true);

    // Each item should have the expected fields
    if (body.items.length > 0) {
      expect(body.items[0]).toMatchObject({
        id:             expect.any(String),
        email:          expect.any(String),
        name:           expect.any(String),
        role:           expect.any(String),
        plan:           expect.any(String),
        isActive:       expect.any(Boolean),
        aiFreeUsesUsed: expect.any(Number),
      });
    }
  });

  it("GET /admin/users filters by plan", async () => {
    const { token } = await createVerifiedAdmin("admin-users-filter@test.com");

    // Create a PRO user to filter for
    await createUser({
      email:          "admin-users-pro-target@test.com",
      password:       "Passw0rd!",
      emailVerifiedAt: new Date(),
      plan:           "PRO",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users?plan=PRO",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.every((u: any) => u.plan === "PRO")).toBe(true);
  });


  // --- PATCH /admin/users/:userId/plan ---

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
      email:          "admin-plan-nonadmin@test.com",
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
    const { token } = await createVerifiedAdmin("admin-plan-update@test.com");

    const target = await createUser({
      email:          "admin-plan-target@test.com",
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

    // Confirm DB updated
    const dbUser = await prisma.user.findUnique({
      where:  { id: target.id },
      select: { plan: true },
    });
    expect(dbUser?.plan).toBe("PRO");
  });

  it("PATCH /admin/users/:userId/plan returns 404 for unknown user", async () => {
    const { token } = await createVerifiedAdmin("admin-plan-404@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/nonexistent-id/plan",
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "PRO" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /admin/users/:userId/plan rejects invalid plan value", async () => {
    const { token } = await createVerifiedAdmin("admin-plan-invalid@test.com");

    const res = await app.inject({
      method:  "PATCH",
      url:     "/api/v1/admin/users/some-id/plan",
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: "INVALID_PLAN" },
    });

    expect(res.statusCode).toBe(400);
  });
});