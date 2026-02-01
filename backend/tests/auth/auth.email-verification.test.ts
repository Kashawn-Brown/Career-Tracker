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

// Test suite for email verification functionality
describe("Auth: email verification", () => {
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
    // DB truncation already happens globally in testSetup; this just keeps email assertions clean.
    clearEmailMock();
  });

  // Test verification email is sent and token is usable
  it("register issues a verify_email email with a usable token and stores hashed token in DB", async () => {
    const email = "verify@test.com";
    const password = "GoodPassw0rd!";
    const name = "Verify User";

    // Register the user
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name },
    });

    expect(res.statusCode).toBe(201);

    // Get the last email of kind "verify_email" and extract the token
    const last = getLastEmailByKind("verify_email");
    const token = extractTokenFromEmailHtml(last.html, "/verify-email");

    // Assert: user starts unverified
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });
    expect(user).not.toBeNull();
    expect(user!.emailVerifiedAt).toBeNull();

    // Assert: token is stored hashed only
    const tokenRow = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { consumedAt: true, expiresAt: true, userId: true },
    });

    // Expect the token row to not be null, the user ID to match, the consumedAt to be null, and the expiresAt to be greater than the current time
    expect(tokenRow).not.toBeNull();
    expect(tokenRow!.userId).toBe(user!.id);
    expect(tokenRow!.consumedAt).toBeNull();
    expect(tokenRow!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // Test verify-email endpoint consumes token and sets emailVerifiedAt; token cannot be reused
  it("verify-email consumes token and sets emailVerifiedAt; token cannot be reused", async () => {
    const email = "verify2@test.com";
    const password = "GoodPassw0rd!";
    const name = "Verify User 2";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name },
    });

    // Get the last email of kind "verify_email" and extract the token
    const token = extractTokenFromEmailHtml(
      getLastEmailByKind("verify_email").html,
      "/verify-email"
    );

    // Verify the user
    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });

    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toEqual({ ok: true });

    // Assert: user becomes verified
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerifiedAt: true },
    });
    expect(user!.emailVerifiedAt).not.toBeNull();

    // Assert: token is consumed
    const tokenRow = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { consumedAt: true },
    });
    expect(tokenRow!.consumedAt).not.toBeNull();

    // Reuse should fail
    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });

    //Expect the reuse to be unsuccessful 400 + body has the message "Invalid or expired token"
    expect(reuse.statusCode).toBe(400);
    expect(reuse.json()).toEqual({ message: "Invalid or expired token" });
  });

  // Test verify-email rejects invalid token
  it("verify-email rejects invalid token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: "this-is-not-a-real-token-xxxxxxxxxxxxxxxx" },
    });

    // Expect the invalid token to be rejected 400 + body has the message "Invalid or expired token"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ message: "Invalid or expired token" });
  });

  // Test resend-verification does nothing for missing users & doesn't send out email
  it("resend-verification is non-enumerating: missing user returns ok and sends no email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/resend-verification",
      payload: { email: "does-not-exist@test.com" },
    });

    // Expect the missing user to be successful 200 + body has ok: true
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(getEmailsByKind("verify_email").length).toBe(0);
  });

  // Test resend-verification does nothing for already verified users
  it("resend-verification does nothing for already verified users", async () => {
    const email = "verified@test.com";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password: "GoodPassw0rd!", name: "Verified User" },
    });

    // Get the last email of kind "verify_email" and extract the token
    const token = extractTokenFromEmailHtml(
      getLastEmailByKind("verify_email").html,
      "/verify-email"
    );

    // Verify the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });

    // Clear the email mock
    clearEmailMock();

    // Resend the verification email
    const resend = await app.inject({
      method: "POST",
      url: "/api/v1/auth/resend-verification",
      payload: { email },
    });

    // Expect the resend to be successful 200 + body has ok: true
    expect(resend.statusCode).toBe(200);
    expect(resend.json()).toEqual({ ok: true });

    // Expect the email mock to still be empty (no email sent)
    expect(getEmailsByKind("verify_email").length).toBe(0);
  });

  // Test resend-verification issues a new token and invalidates prior active tokens
  it("resend-verification issues a new token and invalidates prior active tokens", async () => {
    const email = "unverified@test.com";

    // Register the user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password: "GoodPassw0rd!", name: "Unverified User" },
    });

    // Get the first token
    const firstToken = extractTokenFromEmailHtml(
      getLastEmailByKind("verify_email").html,
      "/verify-email"
    );

    // Clear the email mock
    clearEmailMock();

    // Resend the verification email
    const resend = await app.inject({
      method: "POST",
      url: "/api/v1/auth/resend-verification",
      payload: { email },
    });

    // Expect the resend to be successful 200 + body has ok: true
    expect(resend.statusCode).toBe(200);
    expect(resend.json()).toEqual({ ok: true });

    // Get the second token
    const secondToken = extractTokenFromEmailHtml(
      getLastEmailByKind("verify_email").html,
      "/verify-email"
    );

    // Expect the second token to not be the same as the first token
    expect(secondToken).not.toBe(firstToken);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Get the tokens
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
      select: { tokenHash: true, consumedAt: true },
      orderBy: { createdAt: "asc" },
    });

    // should now have at least two tokens; older ones consumed, newest active
    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens[tokens.length - 1].consumedAt).toBeNull();

    // old token should now fail (invalidated via consumedAt)
    const oldVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: firstToken },
    });
    expect(oldVerify.statusCode).toBe(400);

    // new token should succeed
    const newVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: secondToken },
    });

    // Expect the new verify to be successful 200 + body has ok: true
    expect(newVerify.statusCode).toBe(200);
    expect(newVerify.json()).toEqual({ ok: true });
  });
});
