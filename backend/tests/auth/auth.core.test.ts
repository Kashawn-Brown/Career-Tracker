import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { cookieHeader, getCookieValueFromSetCookie, getSetCookieList } from "../_helpers/http.js";
import { createUser, signAccessToken } from "../_helpers/factories.js";

const ORIGIN = "http://localhost:3000";
const REFRESH_COOKIE_NAME = "career_tracker_refresh";

// Test suite for core auth functionality
describe("Auth core", () => {
  const app = buildApp();

  // Before all tests, build the app
  beforeAll(async () => {
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Test that the register endpoint sets the refresh cookie and returns the user, token, and csrf token
  it("register -> sets refresh cookie and returns { user, token, csrfToken }", async () => {

    // Inject the register request
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "core-register@test.com",
        password: "Passw0rd!",
        name: "Core Register",
      },
    });

    // Expect the response to be successful + bodyhas the user, token, and csrf token
    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body).toHaveProperty("user");
    expect(body).toHaveProperty("token");
    expect(body).toHaveProperty("csrfToken");

    // Refresh cookie should be set
    const setCookies = getSetCookieList(res.headers);
    const refreshCookie = getCookieValueFromSetCookie(setCookies, REFRESH_COOKIE_NAME);
    expect(typeof refreshCookie).toBe("string");
    expect((refreshCookie ?? "").length).toBeGreaterThan(10);

    // User should exist in DB (emailVerifiedAt starts null)
    const dbUser = await prisma.user.findUnique({
      where: { email: "core-register@test.com" },
      select: { emailVerifiedAt: true },
    });
    // Expect the user to exist in the DB + emailVerifiedAt to be null
    expect(dbUser).not.toBeNull();
    expect(dbUser?.emailVerifiedAt).toBeNull();
  });

  // Test that the login endpoint rejects invalid credentials; succeeds on valid credentials and returns the token
  it("login -> rejects invalid creds; accepts valid creds and returns token", async () => {
    
    // Create user via register so it matches real flow
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "core-login@test.com",
        password: "Passw0rd!",
        name: "Core Login",
      },
    });

    // Test 1: Reject invalid credentials

    // Attempt to login with invalid credentials
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-login@test.com", password: "WrongPass1!" },
    });

    // Expect the response to be unsuccessful + body has the message "Invalid credentials"
    expect(bad.statusCode).toBe(401);
    expect(bad.json()).toEqual({ message: "Invalid credentials" });

    
    // Test 2: Accept valid credentials

    // Attempt to login with valid credentials
    const good = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-login@test.com", password: "Passw0rd!" },
    });

    // Expect the response to be successful + body has the user, token, and csrf token
    expect(good.statusCode).toBe(200);

    const body = good.json();
    expect(body).toHaveProperty("user");
    expect(body).toHaveProperty("token");
    expect(body).toHaveProperty("csrfToken");

    // Expect the refresh cookie to be set
    const setCookies = getSetCookieList(good.headers);
    const refreshCookie = getCookieValueFromSetCookie(setCookies, REFRESH_COOKIE_NAME);
    expect(typeof refreshCookie).toBe("string");
  });

  // Test that the csrf endpoint returns null without refresh cookie; returns token with refresh cookie
  it("csrf -> returns null without refresh cookie; returns token with refresh cookie", async () => {
    
    // Test 1: Return null without refresh cookie

    // Call /csrf with no cookies 
    const noCookie = await app.inject({
      method: "GET",
      url: "/api/v1/auth/csrf",
      headers: { origin: ORIGIN },
    });

    // Expect the response to be successful + body has csrfToken null
    expect(noCookie.statusCode).toBe(200);
    expect(noCookie.json()).toEqual({ csrfToken: null });


    // Test 2: Return token with refresh cookie

    // Register + login to obtain refresh cookie
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "core-csrf@test.com",
        password: "Passw0rd!",
        name: "Core CSRF",
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-csrf@test.com", password: "Passw0rd!" },
    });

    // Expect the refresh cookie to be set
    const setCookies = getSetCookieList(login.headers);
    const refreshCookie = getCookieValueFromSetCookie(setCookies, REFRESH_COOKIE_NAME);
    expect(refreshCookie).not.toBeNull();

    // Call /csrf again, with the refresh cookie (simulating a browser request that includes the refresh cookie)
    const withCookie = await app.inject({
      method: "GET",
      url: "/api/v1/auth/csrf",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie!),
      },
    });

    // Expect the response to be successful + body has csrfToken
    expect(withCookie.statusCode).toBe(200);
    const body = withCookie.json();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(10);
  });

  // Test that the refresh endpoint rotates the refresh cookie + csrf token; logout clears the refresh cookie
  it("refresh rotates refresh cookie + csrf token; logout clears refresh cookie", async () => {
    
    // Test 1: Rotate the refresh cookie + csrf token

    // Register + login to obtain refresh cookie
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "core-refresh@test.com",
        password: "Passw0rd!",
        name: "Core Refresh",
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-refresh@test.com", password: "Passw0rd!" },
    });

    // Expect the refresh cookie to be set
    const loginBody = login.json();
    const loginSetCookies = getSetCookieList(login.headers);
    const refreshCookie1 = getCookieValueFromSetCookie(loginSetCookies, REFRESH_COOKIE_NAME);
    expect(refreshCookie1).not.toBeNull();


    // Test 2: Clear the refresh cookie

    // Call /refresh with the refresh cookie + csrf token from login
    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie1!),
        "x-csrf-token": loginBody.csrfToken,
      },
    });

    // Expect the response to be successful + body has token + csrf token
    expect(refresh.statusCode).toBe(200);

    const refreshBody = refresh.json();
    expect(typeof refreshBody.token).toBe("string");
    expect(typeof refreshBody.csrfToken).toBe("string");

    const refreshSetCookies = getSetCookieList(refresh.headers);
    const refreshCookie2 = getCookieValueFromSetCookie(refreshSetCookies, REFRESH_COOKIE_NAME);
    expect(refreshCookie2).not.toBeNull();
    expect(refreshCookie2).not.toBe(refreshCookie1);

    // Logout using the rotated session + csrf
    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie2!),
        "x-csrf-token": refreshBody.csrfToken,
      },
    });

    // Expect the response to be successful + body has ok: true
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toEqual({ ok: true });

    // Expect the refresh cookie to be cleared
    const logoutSetCookies = getSetCookieList(logout.headers);
    // clearRefreshCookie() sets the cookie again with empty value + expiry, so it should appear in Set-Cookie.
    const cleared = logoutSetCookies.some((c) => typeof c === "string" && c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(cleared).toBe(true);
  });

  // Test that the me endpoint requires a Bearer token; valid token returns req.user
  it("/me requires Bearer token; valid token returns req.user", async () => {

    // Register user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "core-me@test.com",
        password: "Passw0rd!",
        name: "Core Me",
      },
    });

    // Login user
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-me@test.com", password: "Passw0rd!" },
    });

    const loginBody = login.json();

    // Attempt to call /me without a Bearer token
    const missing = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    // Expect the response to be unsuccessful + body has the message "Missing Bearer token"
    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toEqual({ message: "Missing Bearer token", code: "UNAUTHORIZED" });

    // Call /me with a Bearer token
    const ok = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        Authorization: `Bearer ${loginBody.token}`,
      },
    });

    // Expect the response to be successful + body has the user
    expect(ok.statusCode).toBe(200);
    const body = ok.json();

    // auth/me returns { user: { id, email } } (from requireAuth hydration)
    expect(body).toHaveProperty("user");
    expect(typeof body.user.id).toBe("string");
    expect(body.user.email).toBe("core-me@test.com");
  });

  // Test that a deactivated account is blocked immediately; successful login reactivates
  it("deactivated account is blocked immediately; successful login reactivates", async () => {

    // Create deactivated user
    const user = await createUser({
      email: "core-deactivated@test.com",
      password: "Passw0rd!",
      name: "Core Deactivated",
      isActive: false,
      emailVerifiedAt: new Date(), // not required for /auth/me, but keeps it realistic
    });

    // Token that matches AuthService.signToken() format
    const token = signAccessToken({ id: user.id, email: user.email });

    // Call /me with the deactivated user's token
    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be unsuccessful + body has the message "Account deactivated"
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual({
      message: "Account deactivated",
      code: "ACCOUNT_DEACTIVATED",
    });

    // Successful login should reactivate
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "core-deactivated@test.com", password: "Passw0rd!" },
    });

    // Expect the response to be successful + body has the user
    expect(login.statusCode).toBe(200);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true },
    });

    // Expect the user to be reactivated
    expect(dbUser?.isActive).toBe(true);
  });
});
