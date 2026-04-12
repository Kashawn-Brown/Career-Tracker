import type { FastifyInstance } from "fastify";
import { ApplicationStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

import { createVerifiedUser } from "../_helpers/factories.js";

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}


// ─────────────────────────────────────────────────────────────────────────────
// Core CRUD + basic filtering
// ─────────────────────────────────────────────────────────────────────────────

// Test suite for the applications core routes.
describe("Applications core", () => {
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

  // Test that the GET /applications route requires a Bearer token.
  it("GET /applications requires Bearer token", async () => {

    // Request the GET /applications route without a Bearer token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications",
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token".
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ message: "Missing Bearer token" });
  });

  // Test that the GET /applications route is blocked when user email is not verified.
  it("GET /applications is blocked when email is not verified", async () => {
    const { createUser, signAccessToken } = await import("../_helpers/factories.js");

    // Create an unverified user.
    const user = await createUser({ email: "test@test.com", password: "Passw0rd!", emailVerifiedAt: null });
    const token = signAccessToken(user);

    // Request the GET /applications route with the unverified user's token.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications",
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 403 + body has the code "EMAIL_NOT_VERIFIED".
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /applications route creates an application.
  it("POST /applications creates application (defaults + normalization)", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Request the POST /applications route with the verified user's token.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company: "  Acme Corp  ",
        position: "  Backend Dev  ",

        // Whitespace-only optional fields are normalized to null.
        location: "   ",
        salaryDetails: "\n\t ",
      },
    });

    // Expect the response to be successful 201 + body has the application.
    expect(res.statusCode).toBe(201);

    const body = res.json() as any;
    expect(body).toHaveProperty("application");

    // Expect the application to have the default values.
    expect(body.application).toMatchObject({
      company: "Acme Corp",
      position: "Backend Dev",
      status: ApplicationStatus.APPLIED,
      isFavorite: false,
      location: null,
      salaryDetails: null,
    });
  });

  // Test that the GET /applications route supports sorting + pagination.
  it("GET /applications supports sorting + pagination", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create 3 applications.
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Beta", position: "Dev", status: ApplicationStatus.WISHLIST },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Alpha", position: "Dev", status: ApplicationStatus.WISHLIST },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Gamma", position: "Dev", status: ApplicationStatus.WISHLIST },
    });

    // Get 1 page of the users applications (sorted by company ascending + page size 2).
    const page1 = await app.inject({
      method: "GET",
      url: "/api/v1/applications?sortBy=company&sortDir=asc&page=1&pageSize=2",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the first 2 applications (Alpha and Beta).
    expect(page1.statusCode).toBe(200);
    const body1 = page1.json() as any;

    expect(body1).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(body1.items).toHaveLength(2);
    expect(body1.items.map((a: any) => a.company)).toEqual(["Alpha", "Beta"]);

    // Get 2nd page of the users applications (sorted by company ascending + page size 2).
    const page2 = await app.inject({
      method: "GET",
      url: "/api/v1/applications?sortBy=company&sortDir=asc&page=2&pageSize=2",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the last application (Gamma).
    expect(page2.statusCode).toBe(200);
    const body2 = page2.json() as any;

    expect(body2).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(body2.items).toHaveLength(1);
    expect(body2.items[0].company).toBe("Gamma");
  });

  // Test that the GET /applications route keeps nulls last when sorting nullable fields.
  it("GET /applications keeps nulls last for nullable sorts (dateApplied, location)", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create 3 applications (one intentionally has null dateApplied + null location).
    const createNull = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Null Fields", position: "Dev", status: ApplicationStatus.WISHLIST },
    });

    const createOld = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Older", position: "Dev", status: ApplicationStatus.WISHLIST, location: "Toronto" },
    });

    const createNew = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Newer", position: "Dev", status: ApplicationStatus.WISHLIST, location: "Waterloo" },
    });

    const idNull = (createNull.json() as any).application.id as string;
    const idOld  = (createOld.json()  as any).application.id as string;
    const idNew  = (createNew.json()  as any).application.id as string;

    // Set dateApplied directly (leave Null Fields as null).
    await prisma.jobApplication.update({
      where: { id: idOld },
      data:  { dateApplied: new Date("2026-01-01T00:00:00.000Z") },
    });
    await prisma.jobApplication.update({
      where: { id: idNew },
      data:  { dateApplied: new Date("2026-01-02T00:00:00.000Z") },
    });

    // dateApplied asc: non-null first (older -> newer), null last
    const dateAsc = await app.inject({
      method: "GET",
      url:    "/api/v1/applications?sortBy=dateApplied&sortDir=asc&pageSize=10",
      headers: authHeader(token),
    });
    expect(dateAsc.statusCode).toBe(200);
    const dateAscBody = dateAsc.json() as any;
    expect(dateAscBody.items.map((a: any) => a.company)).toEqual(["Older", "Newer", "Null Fields"]);
    expect(dateAscBody.items[2].dateApplied).toBe(null);

    // dateApplied desc: non-null first (newer -> older), null last
    const dateDesc = await app.inject({
      method: "GET",
      url:    "/api/v1/applications?sortBy=dateApplied&sortDir=desc&pageSize=10",
      headers: authHeader(token),
    });
    expect(dateDesc.statusCode).toBe(200);
    const dateDescBody = dateDesc.json() as any;
    expect(dateDescBody.items.map((a: any) => a.company)).toEqual(["Newer", "Older", "Null Fields"]);
    expect(dateDescBody.items[2].dateApplied).toBe(null);

    // location is no longer a sortable field (Phase 11) — nulls-last verified via dateApplied above.
  });

  // Test that the GET /applications route supports filters (q, status, isFavorite).
  it("GET /applications supports filters (q, status, isFavorite)", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create 2 applications.
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company:    "Alpha Company",
        position:   "Dev",
        status:     ApplicationStatus.WISHLIST,
        isFavorite: true,
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company:  "Beta Company",
        position: "Dev",
        status:   ApplicationStatus.OFFER,
      },
    });

    // Get applications with "alpha" in the company or position.
    const qRes = await app.inject({
      method: "GET",
      url:    "/api/v1/applications?q=alpha",
      headers: authHeader(token),
    });
    expect(qRes.statusCode).toBe(200);
    const qBody = qRes.json() as any;
    expect(qBody.total).toBe(1);
    expect(qBody.items[0].company).toBe("Alpha Company");

    // Get applications with status "WISHLIST".
    const statusRes = await app.inject({
      method: "GET",
      url:    `/api/v1/applications?status=${ApplicationStatus.WISHLIST}`,
      headers: authHeader(token),
    });
    expect(statusRes.statusCode).toBe(200);
    const statusBody = statusRes.json() as any;
    expect(statusBody.total).toBe(1);
    expect(statusBody.items[0].status).toBe(ApplicationStatus.WISHLIST);

    // Get applications with isFavorite "true".
    const favRes = await app.inject({
      method: "GET",
      url:    "/api/v1/applications?isFavorite=true",
      headers: authHeader(token),
    });
    expect(favRes.statusCode).toBe(200);
    const favBody = favRes.json() as any;
    expect(favBody.total).toBe(1);
    expect(favBody.items[0].isFavorite).toBe(true);
  });

  // Test that the GET /applications route supports fitScore range filters.
  it("GET /applications supports fitScore range filters", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create 2 applications.
    const createA = await app.inject({
      method: "POST",
      url:    "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "High Fit", position: "Dev" },
    });
    const createB = await app.inject({
      method: "POST",
      url:    "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Low Fit", position: "Dev" },
    });

    const idA = (createA.json() as any).application.id as string;
    const idB = (createB.json() as any).application.id as string;

    // Set fitScore directly to isolate list filtering behavior.
    await prisma.jobApplication.update({
      where: { id: idA },
      data:  { fitScore: 80, fitUpdatedAt: new Date() },
    });
    await prisma.jobApplication.update({
      where: { id: idB },
      data:  { fitScore: 40, fitUpdatedAt: new Date() },
    });

    // Get applications with fitScore >= 50 (sorted by fitScore descending).
    const res = await app.inject({
      method: "GET",
      url:    "/api/v1/applications?fitMin=50&sortBy=fitScore&sortDir=desc",
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.total).toBe(1);
    expect(body.items[0].company).toBe("High Fit");
    expect(body.items[0].fitScore).toBe(80);
  });

  // Test that the GET /applications/:id route returns 404 when not owned.
  it("GET /applications/:id returns 404 when not owned", async () => {

    // Create a verified user.
    const { token: tokenA } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create an application.
    const createRes = await app.inject({
      method: "POST",
      url:    "/api/v1/applications",
      headers: authHeader(tokenA),
      payload: { company: "Acme", position: "Dev" },
    });
    const appId = (createRes.json() as any).application.id as string;

    // Create another verified user.
    const { token: tokenB } = await createVerifiedUser("test2@test.com", "Passw0rd!");

    // Request the GET /applications/:id route with the other user's token.
    const res = await app.inject({
      method: "GET",
      url:    `/api/v1/applications/${appId}`,
      headers: authHeader(tokenB),
    });

    // Expect 404 — user B does not own the application.
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Application not found" });
  });

  // Test that the PATCH /applications/:id route updates + auto-sets dateApplied when moving to APPLIED.
  it("PATCH /applications/:id updates + auto-sets dateApplied when moving to APPLIED", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create an application in WISHLIST status.
    const createRes = await app.inject({
      method: "POST",
      url:    "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company:  "Acme",
        position: "Dev",
        status:   ApplicationStatus.WISHLIST,
      },
    });
    const appId = (createRes.json() as any).application.id as string;

    // Patch to APPLIED with whitespace-only notes.
    const patchRes = await app.inject({
      method: "PATCH",
      url:    `/api/v1/applications/${appId}`,
      headers: authHeader(token),
      payload: {
        status: ApplicationStatus.APPLIED,
        notes:  "   ", // whitespace-only → null
      },
    });
    expect(patchRes.statusCode).toBe(200);

    const patched = patchRes.json() as any;
    expect(patched.application.status).toBe(ApplicationStatus.APPLIED);
    expect(patched.application.notes).toBe(null);

    // dateApplied is auto-set when switching to APPLIED and was previously null.
    expect(patched.application.dateApplied).toBeTruthy();
    const appliedAt = new Date(patched.application.dateApplied).getTime();
    expect(Number.isFinite(appliedAt)).toBe(true);
    expect(Math.abs(appliedAt - Date.now())).toBeLessThan(60_000);
  });

  // Test that the DELETE /applications/:id route deletes and subsequent reads return 404.
  it("DELETE /applications/:id deletes and subsequent reads return 404", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create an application.
    const createRes = await app.inject({
      method: "POST",
      url:    "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Acme", position: "Dev" },
    });
    const appId = (createRes.json() as any).application.id as string;

    // Delete it.
    const delRes = await app.inject({
      method: "DELETE",
      url:    `/api/v1/applications/${appId}`,
      headers: authHeader(token),
    });
    expect(delRes.statusCode).toBe(204);

    // Subsequent GET should return 404.
    const getRes = await app.inject({
      method: "GET",
      url:    `/api/v1/applications/${appId}`,
      headers: authHeader(token),
    });
    expect(getRes.statusCode).toBe(404);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Advanced filtering
//
// Uses the same app instance and createVerifiedUser per test — each test
// creates its own isolated user so data never bleeds between tests.
// ─────────────────────────────────────────────────────────────────────────────

describe("Applications > Advanced filtering", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Creates a fresh verified user and returns their userId + token.
  // Each test that needs to write data calls this to stay isolated.
  async function freshUser() {
    const email = `filter-${Date.now()}-${Math.random().toString(16).slice(2)}@test.com`;
    const { user, token } = await createVerifiedUser(email, "Passw0rd!");
    return { userId: user.id, token };
  }

  // Helper: POST an application through the API for a given token.
  async function postApp(
    token: string,
    overrides: {
      status?:   ApplicationStatus;
      jobType?:  string;
      workMode?: string;
      location?: string;
      tagsText?: string;
      isFavorite?: boolean;
    } = {}
  ) {
    const res = await app.inject({
      method:  "POST",
      url:     "/api/v1/applications",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        company:    "Test Co",
        position:   "Engineer",
        status:     overrides.status   ?? ApplicationStatus.APPLIED,
        jobType:    overrides.jobType  ?? "FULL_TIME",
        workMode:   overrides.workMode ?? "REMOTE",
        location:   overrides.location  ?? undefined,
        tagsText:   overrides.tagsText  ?? undefined,
        isFavorite: overrides.isFavorite ?? false,
      },
    });
    return (res.json() as any).application as { id: string };
  }


  // ── Multi-select filters ──────────────────────────────────────────────────

  it("statuses CSV filter returns only matching statuses", async () => {
    const { token } = await freshUser();
    await postApp(token, { status: ApplicationStatus.APPLIED });
    await postApp(token, { status: ApplicationStatus.INTERVIEW });
    await postApp(token, { status: ApplicationStatus.REJECTED });

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?statuses=APPLIED,INTERVIEW",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.every((a: any) =>
      ["APPLIED", "INTERVIEW"].includes(a.status)
    )).toBe(true);
    expect(body.items.some((a: any) => a.status === "REJECTED")).toBe(false);
  });

  it("jobTypes CSV filter returns only matching job types", async () => {
    const { userId, token } = await freshUser();

    // Set jobType via direct DB insert since the API defaults to FULL_TIME
    await prisma.jobApplication.createMany({
      data: [
        { userId, company: "Co", position: "P", jobType: "FULL_TIME" },
        { userId, company: "Co", position: "P", jobType: "CONTRACT"  },
        { userId, company: "Co", position: "P", jobType: "INTERNSHIP" },
      ],
    });

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?jobTypes=FULL_TIME,CONTRACT",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.every((a: any) =>
      ["FULL_TIME", "CONTRACT"].includes(a.jobType)
    )).toBe(true);
    expect(body.items.some((a: any) => a.jobType === "INTERNSHIP")).toBe(false);
  });

  it("workModes CSV filter returns only matching work modes", async () => {
    const { userId, token } = await freshUser();

    await prisma.jobApplication.createMany({
      data: [
        { userId, company: "Co", position: "P", workMode: "REMOTE" },
        { userId, company: "Co", position: "P", workMode: "HYBRID" },
        { userId, company: "Co", position: "P", workMode: "ONSITE" },
      ],
    });

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?workModes=REMOTE,HYBRID",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.every((a: any) =>
      ["REMOTE", "HYBRID"].includes(a.workMode)
    )).toBe(true);
    expect(body.items.some((a: any) => a.workMode === "ONSITE")).toBe(false);
  });

  it("plural filter takes precedence over singular when both are present", async () => {
    const { token } = await freshUser();
    await postApp(token, { status: ApplicationStatus.APPLIED });
    await postApp(token, { status: ApplicationStatus.OFFER   });

    // Singular says WISHLIST, plural says APPLIED,OFFER — plural wins.
    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?status=WISHLIST&statuses=APPLIED,OFFER",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.every((a: any) =>
      ["APPLIED", "OFFER"].includes(a.status)
    )).toBe(true);
    expect(body.items.some((a: any) => a.status === "WISHLIST")).toBe(false);
  });


  // ── Date range filters ────────────────────────────────────────────────────

  it("dateAppliedFrom filters out applications applied before the boundary", async () => {
    const { userId, token } = await freshUser();

    // Insert applications with specific dateApplied values directly.
    await prisma.jobApplication.createMany({
      data: [
        { userId, company: "Early", position: "P", dateApplied: new Date("2024-01-15T12:00:00.000Z") },
        { userId, company: "Late",  position: "P", dateApplied: new Date("2024-06-15T12:00:00.000Z") },
      ],
    });

    const boundary = "2024-03-01T00:00:00.000Z";
    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/applications?dateAppliedFrom=${encodeURIComponent(boundary)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;

    // All results must have dateApplied on or after the boundary (or null — excluded by filter).
    expect(body.items.every((a: any) =>
      a.dateApplied !== null && new Date(a.dateApplied) >= new Date(boundary)
    )).toBe(true);
    expect(body.items.some((a: any) => a.company === "Early")).toBe(false);
    expect(body.items.some((a: any) => a.company === "Late" )).toBe(true);
  });

  it("dateAppliedTo filters out applications applied after the boundary", async () => {
    const { userId, token } = await freshUser();

    await prisma.jobApplication.createMany({
      data: [
        { userId, company: "Early", position: "P", dateApplied: new Date("2024-01-15T12:00:00.000Z") },
        { userId, company: "Late",  position: "P", dateApplied: new Date("2024-09-15T12:00:00.000Z") },
      ],
    });

    const boundary = "2024-06-01T23:59:59.999Z";
    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/applications?dateAppliedTo=${encodeURIComponent(boundary)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.every((a: any) =>
      a.dateApplied !== null && new Date(a.dateApplied) <= new Date(boundary)
    )).toBe(true);
    expect(body.items.some((a: any) => a.company === "Late" )).toBe(false);
    expect(body.items.some((a: any) => a.company === "Early")).toBe(true);
  });

  it("updatedFrom/updatedTo filters by updatedAt range", async () => {
    const { token } = await freshUser();

    // Capture window around creation.
    const before = new Date(Date.now() - 2000).toISOString();
    await postApp(token);
    const after = new Date(Date.now() + 2000).toISOString();

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/applications?updatedFrom=${encodeURIComponent(before)}&updatedTo=${encodeURIComponent(after)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBeGreaterThan(0);
  });


  // ── Expanded text search ──────────────────────────────────────────────────

  it("search hits location field", async () => {
    const { userId, token } = await freshUser();
    const unique = `loc-${Date.now()}`;

    await prisma.jobApplication.create({
      data:   { userId, company: "Somewhere Inc", position: "Dev", location: unique },
      select: { id: true },
    });

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/applications?q=${encodeURIComponent(unique)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.some((a: any) => a.location === unique)).toBe(true);
  });

  it("search hits tagsText field", async () => {
    const { userId, token } = await freshUser();
    const unique = `tag-${Date.now()}`;

    await prisma.jobApplication.create({
      data:   { userId, company: "Tagged Co", position: "Dev", tagsText: unique },
      select: { id: true },
    });

    const res = await app.inject({
      method:  "GET",
      url:     `/api/v1/applications?q=${encodeURIComponent(unique)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBeGreaterThan(0);
  });


  // ── Validation errors — auth token required to reach filter logic ─────────

  it("invalid enum value in statuses CSV returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?statuses=APPLIED,NOT_A_STATUS",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_FILTER_VALUE" });
  });

  it("invalid enum value in jobTypes CSV returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?jobTypes=FULL_TIME,BANANA",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_FILTER_VALUE" });
  });

  it("invalid enum value in workModes CSV returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?workModes=REMOTE,UNDERWATER",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_FILTER_VALUE" });
  });

  it("dateApplied range with from > to returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?dateAppliedFrom=2024-12-01T00:00:00.000Z&dateAppliedTo=2024-01-01T00:00:00.000Z",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_DATE_RANGE" });
  });

  it("updated range with from > to returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?updatedFrom=2024-12-01T00:00:00.000Z&updatedTo=2024-01-01T00:00:00.000Z",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_DATE_RANGE" });
  });

  it("fitMin > fitMax returns 400", async () => {
    const { token } = await freshUser();

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/applications?fitMin=80&fitMax=20",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "INVALID_FIT_RANGE" });
  });
});