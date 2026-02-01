import type { FastifyInstance } from "fastify";
import { ApplicationStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

import { createUser, createVerifiedUser, signAccessToken } from "../_helpers/factories.js";

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

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

  // Test that the GET /applications route supports filters (q, status, isFavorite).
  it("GET /applications supports filters (q, status, isFavorite)", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create 2 application.
    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company: "Alpha Company",
        position: "Dev",
        status: ApplicationStatus.WISHLIST,
        isFavorite: true,
      },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company: "Beta Company",
        position: "Dev",
        status: ApplicationStatus.OFFER,
      },
    });

    // Get applications with "alpha" in the company or position.
    const qRes = await app.inject({
      method: "GET",
      url: "/api/v1/applications?q=alpha",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the "Alpha Company" application.
    expect(qRes.statusCode).toBe(200);
    const qBody = qRes.json() as any;
    expect(qBody.total).toBe(1);
    expect(qBody.items[0].company).toBe("Alpha Company");

    // Get applications with status "WISHLIST".
    const statusRes = await app.inject({
      method: "GET",
      url: `/api/v1/applications?status=${ApplicationStatus.WISHLIST}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the "Alpha Company" application with status "WISHLIST".
    expect(statusRes.statusCode).toBe(200);
    const statusBody = statusRes.json() as any;
    expect(statusBody.total).toBe(1);
    expect(statusBody.items[0].status).toBe(ApplicationStatus.WISHLIST);

    // Get applications with isFavorite "true".
    const favRes = await app.inject({
      method: "GET",
      url: "/api/v1/applications?isFavorite=true",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the "Alpha Company" application with isFavorite "true".
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
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "High Fit", position: "Dev" },
    });
    const createB = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Low Fit", position: "Dev" },
    });

    // Get the ids of the created applications.
    const idA = (createA.json() as any).application.id as string;
    const idB = (createB.json() as any).application.id as string;

    // Set fitScore directly to isolate list filtering behavior.
    await prisma.jobApplication.update({
      where: { id: idA },
      data: { fitScore: 80, fitUpdatedAt: new Date() },
    });
    await prisma.jobApplication.update({
      where: { id: idB },
      data: { fitScore: 40, fitUpdatedAt: new Date() },
    });

    // Get applications with fitScore between 50 and 100 (sorted by fitScore descending).
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications?fitMin=50&sortBy=fitScore&sortDir=desc",
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the "High Fit" application with fitScore 80.
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
      url: "/api/v1/applications",
      headers: authHeader(tokenA),
      payload: { company: "Acme", position: "Dev" },
    });

    // Get the id of the created application.
    const appId = (createRes.json() as any).application.id as string;

    // Create another verified user.
    const { token: tokenB } = await createVerifiedUser("test2@test.com", "Passw0rd!");

    // Request the GET /applications/:id route with the other user's token.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}`,
      headers: authHeader(tokenB),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Application not found". (user B does not own the application)
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ message: "Application not found" });
  });

  // Test that the PATCH /applications/:id route updates + auto-sets dateApplied when moving to APPLIED.
  it("PATCH /applications/:id updates + auto-sets dateApplied when moving to APPLIED", async () => {

    // Create a verified user.
    const { token } = await createVerifiedUser("test@test.com", "Passw0rd!");

    // Create an application.
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: {
        company: "Acme",
        position: "Dev",
        status: ApplicationStatus.WISHLIST,
      },
    });

    // Get the id of the created application.
    const appId = (createRes.json() as any).application.id as string;

    // Request the PATCH /applications/:id route with the application id.
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/applications/${appId}`,
      headers: authHeader(token),
      payload: {
        status: ApplicationStatus.APPLIED,
        // Whitespace-only optional fields are normalized to null.
        notes: "   ",
      },
    });

    // Expect the response to be successful 200 + body has the updated application.
    expect(patchRes.statusCode).toBe(200);

    const patched = patchRes.json() as any;
    expect(patched.application.status).toBe(ApplicationStatus.APPLIED);
    expect(patched.application.notes).toBe(null);

    // dateApplied is auto-set when switching to APPLIED and dateApplied is currently null.
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
      url: "/api/v1/applications",
      headers: authHeader(token),
      payload: { company: "Acme", position: "Dev" },
    });

    // Get the id of the created application.
    const appId = (createRes.json() as any).application.id as string;

    // Request the DELETE /applications/:id route with the application id.
    const delRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/applications/${appId}`,
      headers: authHeader(token),
    });

    // Expect the response to be successful 200 + body has the message "Application deleted".
    expect(delRes.statusCode).toBe(200);
    expect(delRes.json()).toMatchObject({ ok: true });

    // Request the GET /applications/:id route with the application id.
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${appId}`,
      headers: authHeader(token),
    });

    // Expect the response to be unsuccessful 404 + body has the message "Application not found". (application has been deleted)
    expect(getRes.statusCode).toBe(404);
  });
});
