import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
} from "../../modules/oauth/oauth.http.js";

// Mock ONLY the network-dependent Google functions + randomness.
// Keep buildGoogleAuthUrl real so it can assert the redirect URL contains our values.
vi.mock("../../modules/oauth/oauth.google.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../modules/oauth/oauth.google.js")>();
  return {
    ...actual,
    createOAuthState: vi.fn(),
    createPkcePair: vi.fn(),
    exchangeCodeForAccessToken: vi.fn(),
    fetchGoogleUserInfo: vi.fn(),
  };
});

import * as Google from "../../modules/oauth/oauth.google.js";

function getSetCookieList(res: any): string[] {
  const raw = res.headers?.["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function findSetCookie(setCookies: string[], startsWith: string): string | undefined {
  return setCookies.find((c) => c.startsWith(startsWith));
}

function cookieHeader(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${k}=${v}`).join("; ");
}

// Test suite for Google OAuth PKCE flow
describe("OAuth: Google PKCE flow", () => {
  let app: FastifyInstance;

  const FRONTEND = "http://localhost:3000";
  const CLIENT_ID = "test-google-client-id";
  const CLIENT_SECRET = "test-google-client-secret";
  const REDIRECT_URI = "http://localhost:80/api/v1/auth/oauth/google/callback";

  const STATE = "state_test_123";
  const VERIFIER = "verifier_test_123";
  const CHALLENGE = "challenge_test_123";

  // Before all tests, set the environment variables and build the app
  beforeAll(async () => {
    process.env.FRONTEND_URL = FRONTEND;
    process.env.GOOGLE_OAUTH_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = CLIENT_SECRET;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = REDIRECT_URI;

    app = buildApp();
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Before each test, mock the Google functions
  beforeEach(() => {
    vi.mocked(Google.createOAuthState).mockReturnValue(STATE);
    vi.mocked(Google.createPkcePair).mockReturnValue({
      codeVerifier: VERIFIER,
      codeChallenge: CHALLENGE,
    });

    vi.mocked(Google.exchangeCodeForAccessToken).mockResolvedValue({
      access_token: "access_token_test",
      token_type: "Bearer",
      expires_in: 3600,
    });

    vi.mocked(Google.fetchGoogleUserInfo).mockResolvedValue({
      sub: "google_sub_test",
      email: "oauth@test.com",
      email_verified: true,
      name: "OAuth User",
    });
  });

  // Test google oauth start flow
  it("GET /google/start sets state + verifier cookies and redirects to Google auth URL", async () => {
    
    // Request the Google OAuth start flow
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/start",
    });

    // Expect the response to be a 302 redirect
    expect(res.statusCode).toBe(302);


    // Expect the redirect URL to contain the Google OAuth URL, client ID, redirect URI, state, and code challenge
    const location = res.headers.location as string;
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain(`client_id=${encodeURIComponent(CLIENT_ID)}`);
    expect(location).toContain(`redirect_uri=${encodeURIComponent(REDIRECT_URI)}`);
    expect(location).toContain(`state=${encodeURIComponent(STATE)}`);
    expect(location).toContain(`code_challenge=${encodeURIComponent(CHALLENGE)}`);

    // Get the set cookies
    const setCookies = getSetCookieList(res);

    const stateCookie = findSetCookie(setCookies, `${GOOGLE_OAUTH_STATE_COOKIE}=${STATE}`);
    const verifierCookie = findSetCookie(setCookies, `${GOOGLE_OAUTH_VERIFIER_COOKIE}=${VERIFIER}`);

    // Expect the state and verifier cookies to be set
    expect(stateCookie, "expected state cookie").toBeTruthy();
    expect(verifierCookie, "expected verifier cookie").toBeTruthy();

    // Cookie scoping/security flags
    expect(stateCookie!).toContain("HttpOnly");
    expect(stateCookie!).toContain("Path=/api/v1/auth/oauth/google");
    expect(verifierCookie!).toContain("HttpOnly");
    expect(verifierCookie!).toContain("Path=/api/v1/auth/oauth/google");
  });

  it("GET /google/callback with ?error redirects to /login?oauth=cancelled and clears oauth cookies", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/callback?error=access_denied&state=whatever",
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/login?oauth=cancelled`);

    const setCookies = getSetCookieList(res);
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_STATE_COOKIE}=`)).toBeTruthy();
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_VERIFIER_COOKIE}=`)).toBeTruthy();
  });

  it("GET /google/callback missing code/state redirects to /login?oauth=failed (and clears oauth cookies)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/callback",
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/login?oauth=failed`);

    const setCookies = getSetCookieList(res);
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_STATE_COOKIE}=`)).toBeTruthy();
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_VERIFIER_COOKIE}=`)).toBeTruthy();
  });

  it("GET /google/callback state mismatch redirects to /login?oauth=failed (and clears oauth cookies)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=abc&state=DIFFERENT_STATE`,
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/login?oauth=failed`);

    const setCookies = getSetCookieList(res);
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_STATE_COOKIE}=`)).toBeTruthy();
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_VERIFIER_COOKIE}=`)).toBeTruthy();
  });

  it("callback: existing OAuthAccount logs in, verifies/reactivates user, creates session + refresh cookie, redirects to /oauth/callback", async () => {
    // Create user (unverified + deactivated)
    const passwordHash = await bcrypt.hash("SomePassw0rd!", 12);

    const user = await prisma.user.create({
      data: {
        email: "oauth-existing@test.com",
        name: "Existing OAuth User",
        passwordHash,
        emailVerifiedAt: null,
        isActive: false,
      },
      select: { id: true },
    });

    // Create existing OAuthAccount for the same Google "sub"
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: "GOOGLE",
        providerAccountId: "google_sub_existing",
      },
    });

    // Mock Google profile to match providerAccountId
    vi.mocked(Google.fetchGoogleUserInfo).mockResolvedValue({
      sub: "google_sub_existing",
      email: "oauth-existing@test.com",
      email_verified: true,
      name: "Existing OAuth User",
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=abc&state=${STATE}`,
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/oauth/callback`);

    // oauth cookies cleared + refresh cookie set
    const setCookies = getSetCookieList(res);
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_STATE_COOKIE}=`)).toBeTruthy();
    expect(findSetCookie(setCookies, `${GOOGLE_OAUTH_VERIFIER_COOKIE}=`)).toBeTruthy();
    expect(findSetCookie(setCookies, "career_tracker_refresh=")).toBeTruthy();

    // user verified + active
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true, isActive: true },
    });

    expect(updated!.emailVerifiedAt).not.toBeNull();
    expect(updated!.isActive).toBe(true);

    // session created
    const sessions = await prisma.authSession.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    expect(sessions.length).toBe(1);

    // Ensure we did not create a second OAuthAccount
    const accounts = await prisma.oAuthAccount.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    expect(accounts.length).toBe(1);
  });

  it("callback: links by email when user exists but OAuthAccount does not; verifies/reactivates, creates OAuthAccount + session", async () => {
    const passwordHash = await bcrypt.hash("SomePassw0rd!", 12);

    const user = await prisma.user.create({
      data: {
        email: "oauth-link@test.com",
        name: "Link User",
        passwordHash,
        emailVerifiedAt: null,
        isActive: false,
      },
      select: { id: true },
    });

    vi.mocked(Google.fetchGoogleUserInfo).mockResolvedValue({
      sub: "google_sub_link",
      email: "oauth-link@test.com",
      email_verified: true,
      name: "Link User",
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=abc&state=${STATE}`,
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/oauth/callback`);

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true, isActive: true },
    });

    expect(updated!.emailVerifiedAt).not.toBeNull();
    expect(updated!.isActive).toBe(true);

    const account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: "google_sub_link",
        },
      },
      select: { userId: true },
    });

    expect(account).not.toBeNull();
    expect(account!.userId).toBe(user.id);

    const sessions = await prisma.authSession.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    expect(sessions.length).toBe(1);
  });

  it("callback: creates a new user when none exists; creates OAuthAccount + session", async () => {
    vi.mocked(Google.fetchGoogleUserInfo).mockResolvedValue({
      sub: "google_sub_new",
      email: "oauth-new@test.com",
      email_verified: true,
      name: "New OAuth User",
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=abc&state=${STATE}`,
      headers: {
        cookie: cookieHeader([
          [GOOGLE_OAUTH_STATE_COOKIE, STATE],
          [GOOGLE_OAUTH_VERIFIER_COOKIE, VERIFIER],
        ]),
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/oauth/callback`);

    const user = await prisma.user.findUnique({
      where: { email: "oauth-new@test.com" },
      select: { id: true, emailVerifiedAt: true, isActive: true, name: true },
    });

    expect(user).not.toBeNull();
    expect(user!.emailVerifiedAt).not.toBeNull();
    expect(user!.isActive).toBe(true);
    expect(user!.name).toBe("New OAuth User");

    const account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: "google_sub_new",
        },
      },
      select: { userId: true },
    });

    expect(account).not.toBeNull();
    expect(account!.userId).toBe(user!.id);

    const sessions = await prisma.authSession.findMany({
      where: { userId: user!.id },
      select: { id: true },
    });
    expect(sessions.length).toBe(1);
  });
});
