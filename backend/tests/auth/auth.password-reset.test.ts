import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { hashToken } from "../../lib/crypto.js";
import {
  clearEmailMock,
  getEmailsByKind,
  getLastEmailByKind,
  extractTokenFromEmailHtml,
} from "../_helpers/email.js";

const REFRESH_COOKIE_NAME = "career_tracker_refresh";
const ORIGIN = "http://localhost:3000";

function getSetCookieList(res: any): string[] {
  const raw = res.headers?.["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function getCookieValue(setCookies: string[], name: string): string | null {
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return match.split(";")[0].split("=")[1] ?? null;
}

function cookieHeader(name: string, value: string) {
  return `${name}=${value}`;
}

// Test suite for password reset functionality
describe("Auth: password reset", () => {
  let app: FastifyInstance;

  // Before all tests, build the app
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Before each test, clear the email mock
  beforeEach(() => {
    clearEmailMock();
  });

  // Test non-enumerating forgot-password flow: missing user returns ok and sends no email
  it("forgot-password is non-enumerating: missing user returns ok and sends no email", async () => {
    
    // Request a password reset for a user that doesn't exist
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email: "missing@test.com" },
    });

    // Expect the request to be successful 200 + body has ok: true
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    
    // Expect no emails to be sent (non-enumerating: doesn't reveal whether something exists or not)
    expect(getEmailsByKind("reset_password").length).toBe(0);
  });

  // Test forgot-password for existing users
  it("forgot-password for existing user creates token + sends reset_password email", async () => {
    const email = "reset1@test.com";
    const password = "GoodPassw0rd!";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name: "Reset User" },
    });

    // Clear the email mock
    clearEmailMock();

    // Request a password reset for the user
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });

    // Expect the request to be successful 200 + body has ok: true
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Get the last email of kind "reset_password" and extract the token
    const last = getLastEmailByKind("reset_password");
    const token = extractTokenFromEmailHtml(last.html, "/reset-password");

    // Get the token row
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { consumedAt: true, expiresAt: true },
    });

    // Expect the token row to not be null, the consumedAt to be null, and the expiresAt to be greater than the current time
    expect(row).not.toBeNull();
    expect(row!.consumedAt).toBeNull();
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // Test reset-password for invalid token
  it("reset-password rejects invalid token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: "not-a-real-token-xxxxxxxxxxxxxxxx", newPassword: "NewPassw0rd!" },
    });

    // Expect the invalid token to be rejected 400 + body has the message "Invalid or expired token"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ message: "Invalid or expired token" });
  });

  // Test valid reset-password flow
  it("reset-password succeeds: consumes token, revokes sessions, old password fails, new password works", async () => {
    const email = "reset2@test.com";
    const oldPassword = "GoodPassw0rd!";
    const newPassword = "BetterPassw0rd!";

    // Register
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password: oldPassword, name: "Reset User 2" },
    });

    // Login to create an active refresh session
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: oldPassword },
    });

    // Expect the login to be successful 200 + body has ok: true
    expect(login.statusCode).toBe(200);
    const loginBody = login.json() as any;

    // Get the refresh token
    const setCookies = getSetCookieList(login);
    const refreshToken = getCookieValue(setCookies, REFRESH_COOKIE_NAME);
    expect(refreshToken).toBeTruthy();

    const csrfToken = loginBody.csrfToken as string;
    expect(typeof csrfToken).toBe("string");
    expect(csrfToken.length).toBeGreaterThan(10);

    // Clear the email mock
    clearEmailMock();

    // Request a password reset for the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });

    // Get the last email of kind "reset_password" and extract the token
    const resetToken = extractTokenFromEmailHtml(
      getLastEmailByKind("reset_password").html,
      "/reset-password"
    );

    // Reset password
    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: resetToken, newPassword },
    });

    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ ok: true });

    // Token consumed
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(resetToken) },
      select: { consumedAt: true },
    });
    expect(row!.consumedAt).not.toBeNull();

    // Refresh should fail because sessions were revoked
    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: ORIGIN,
        "x-csrf-token": csrfToken,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshToken!),
      },
    });

    // Expect the refresh to be unsuccessful 401 + body has the message "Invalid session"
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json()).toEqual({ message: "Invalid session" });

    // Old password no longer works
    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: oldPassword },
    });
    expect(oldLogin.statusCode).toBe(401);
    expect(oldLogin.json()).toEqual({ message: "Invalid credentials" });

    // New password works
    const newLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: newPassword },
    });
    expect(newLogin.statusCode).toBe(200);
  });

  // Test reset-password rejects resetting the new password to the current password (token remains usable)
  it("reset-password rejects resetting to the current password (token remains usable)", async () => {
    const email = "reset3@test.com";
    const password = "GoodPassw0rd!";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name: "Reset User 3" },
    });

    // Clear the email mock
    clearEmailMock();

    // Request a password reset for the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });

    // Get the reset token
    const token = extractTokenFromEmailHtml(
      getLastEmailByKind("reset_password").html,
      "/reset-password"
    );

    // Attempt to reset to same password
    const same = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token, newPassword: password },
    });

    // Expect the reset to be unsuccessful 400 + body has the message "New password must be different from your current password"
    expect(same.statusCode).toBe(400);
    expect(same.json()).toEqual({
      message: "New password must be different from your current password",
    });

    // Token should still be valid; reset to a different password should succeed
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token, newPassword: "DifferentPassw0rd!" },
    });

    // Expect the reset to be successful 200 + body has ok: true
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true });
  });

  // Test forgot-password twice invalidating the first token (only latest works)
  it("forgot-password twice invalidates the first token (only latest works)", async () => {
    const email = "reset4@test.com";
    const password = "GoodPassw0rd!";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name: "Reset User 4" },
    });

    // First token
    clearEmailMock();
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });

    // Get the first token
    const token1 = extractTokenFromEmailHtml(
      getLastEmailByKind("reset_password").html,
      "/reset-password"
    );

    // Second token
    clearEmailMock();
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email },
    });

    // Get the second token
    const token2 = extractTokenFromEmailHtml(
      getLastEmailByKind("reset_password").html,
      "/reset-password"
    );

    expect(token2).not.toBe(token1);

    // First should now be expired/invalid
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: token1, newPassword: "NewPassw0rd!" },
    });
    // Expect the first reset to be unsuccessful 400 + body has the message "Invalid or expired token"
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ message: "Invalid or expired token" });

    // Second should work
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: token2, newPassword: "NewPassw0rd!" },
    });
    // Expect the second reset to be successful 200 + body has ok: true
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true });
  });
});
