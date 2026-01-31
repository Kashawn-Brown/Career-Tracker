import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { cookieHeader, getCookieValueFromSetCookie, getSetCookieList } from "../_helpers/http.js";

const ORIGIN = "http://localhost:3000";
const REFRESH_COOKIE_NAME = "career_tracker_refresh";

// Helper function to register and login a user
async function registerAndLogin(app: ReturnType<typeof buildApp>, email: string, password: string) {
  // Register the user
  const register = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password, name: "Test User" },
  });

  // Expect the response to be successful 201
  expect(register.statusCode).toBe(201);

  // Login the user
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });

  // Expect the response to be successful 200 + body has token + csrfToken + refreshCookie
  expect(login.statusCode).toBe(200);

  const body = login.json();
  const setCookies = getSetCookieList(login.headers);
  const refreshCookie = getCookieValueFromSetCookie(setCookies, REFRESH_COOKIE_NAME);

  expect(typeof body.token).toBe("string");
  expect(typeof body.csrfToken).toBe("string");
  expect(refreshCookie).not.toBeNull();

  return {
    token: body.token as string,
    csrfToken: body.csrfToken as string,
    refreshCookie: refreshCookie as string,
  };
}

// Helper function to verify the user
async function setEmailVerified(email: string) {
  await prisma.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });
}

// Test suite for user settings functionality
describe("User settings", () => {
  const app = buildApp();

  // Before all tests, build the app
  beforeAll(async () => {
    await app.ready();
  });

  // After all tests, close the app
  afterAll(async () => {
    await app.close();
  });

  // Test that the GET /users/me endpoint requires a Bearer token
  it("GET /users/me requires Bearer token", async () => {
    // Call /users/me without a Bearer token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
    });

    // Expect the response to be unsuccessful 401 + body has the message "Missing Bearer token"
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ message: "Missing Bearer token" });
  });

  // Test that the GET /users/me endpoint returns the user profile + aiProRequest (null when none)
  it("GET /users/me returns profile + aiProRequest (null when none)", async () => {
    const email = "me@test.com";
    const password = "Passw0rd!";

    // Register and login the user
    const { token } = await registerAndLogin(app, email, password);

    // Call /users/me with the user's token
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be successful 200 + body has user + aiProRequest (null when none)
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveProperty("user");
    expect(body.user.email).toBe(email);
    expect(body).toHaveProperty("aiProRequest");
    expect(body.aiProRequest).toBeNull();
  });

  // Test that the PATCH /users/me endpoint is blocked when email is not verified; succeeds after verification + normalizes fields
  it("PATCH /users/me is blocked when email is not verified; succeeds after verification + normalizes fields", async () => {
    const email = "patch@test.com";
    const password = "Passw0rd!";

    // Register and login the user
    const { token } = await registerAndLogin(app, email, password);

    // Call /users/me with the user's token (unverified)
    const blocked = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: "New Name" },
    });

    // Expect the response to be unsuccessful 403 + body has the message "Email not verified"
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual({ message: "Email not verified", code: "EMAIL_NOT_VERIFIED" });

    // Mark verified directly in DB (we’re testing /users behavior here, not verify-email flow yet)
    await setEmailVerified(email);

    // Call /users/me again, now with the user's token (verified)
    const ok = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "  New Name  ",
        location: "   ", // should normalize to null
        skills: ["Java", " Java ", "Python"], // trims + dedupes
      },
    });

    // Expect the response to be successful 200 + body has user with normalized fields
    expect(ok.statusCode).toBe(200);

    const body = ok.json();
    expect(body).toHaveProperty("user");
    expect(body.user.name).toBe("New Name");
    expect(body.user.location).toBeNull();
    expect(body.user.skills).toEqual(["Java", "Python"]);
  });

  // Test that the PATCH /users/me endpoint rejects whitespace-only name (service-level validation)
  it("PATCH /users/me rejects whitespace-only name (service-level validation)", async () => {
    const email = "patch-empty-name@test.com";
    const password = "Passw0rd!";

    // Register, login, and verify the user
    const { token } = await registerAndLogin(app, email, password);
    await setEmailVerified(email);

    // Call /users/me with the user's token and a whitespace-only name
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: "   " },
    });

    // Expect the response to be unsuccessful 400 + body has the message "Name cannot be empty"
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ message: "Name cannot be empty" });
  });

  // Test that the POST /users/change-password endpoint is blocked when email is not verified
  it("POST /users/change-password is blocked when email is not verified", async () => {
    const email = "cp-unverified@test.com";
    const password = "Passw0rd!";

    // Register and login the user
    const { token } = await registerAndLogin(app, email, password);

    // Call /users/change-password with the user's token (unverified)
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users/change-password",
      headers: { Authorization: `Bearer ${token}` },
      payload: { oldPassword: password, newPassword: "NewPassw0rd!" },
    });

    // Expect the response to be unsuccessful 403 + body has the message "Email not verified"
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ message: "Email not verified", code: "EMAIL_NOT_VERIFIED" });
  });

  // Test that the POST /users/change-password endpoint succeeds when verified, revokes refresh session, and old password no longer works
  it("POST /users/change-password succeeds when verified, revokes refresh session, and old password no longer works", async () => {
    const email = "cp@test.com";
    const oldPassword = "Passw0rd!";
    const newPassword = "NewPassw0rd!";

    // Register, login, and verify the user
    const { token, csrfToken, refreshCookie } = await registerAndLogin(app, email, oldPassword);
    await setEmailVerified(email);

    // Change the user's password
    const change = await app.inject({
      method: "POST",
      url: "/api/v1/users/change-password",
      headers: { Authorization: `Bearer ${token}` },
      payload: { oldPassword, newPassword },
    });

    // Expect the response to be successful 200 + body has ok: true
    expect(change.statusCode).toBe(200);
    expect(change.json()).toEqual({ ok: true });

    // Should clear refresh cookie
    const changeSetCookies = getSetCookieList(change.headers);
    const cleared = changeSetCookies.some(
      (c) => typeof c === "string" && c.startsWith(`${REFRESH_COOKIE_NAME}=`)
    );
    expect(cleared).toBe(true);

    // Refresh using the old refresh cookie should now fail (session was revoked in DB)
    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie),
        "x-csrf-token": csrfToken,
      },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Invalid session"
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json()).toEqual({ message: "Invalid session" });

    // Old password should fail login
    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: oldPassword },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Invalid credentials"
    expect(oldLogin.statusCode).toBe(401);
    expect(oldLogin.json()).toEqual({ message: "Invalid credentials" });

    // New password should succeed login
    const newLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: newPassword },
    });

    // Expect the response to be successful 200 + body has token
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.json()).toHaveProperty("token");
  });

  // Test that the DELETE /users/deactivate endpoint sets isActive=false, clears cookie, blocks authed requests, and login reactivates
  it("DELETE /users/deactivate sets isActive=false, clears cookie, blocks authed requests, and login reactivates", async () => {
    const email = "deactivate@test.com";
    const password = "Passw0rd!";

    // Register and login the user
    const { token, csrfToken, refreshCookie } = await registerAndLogin(app, email, password);

    // Call /users/deactivate with the user's token
    const deactivate = await app.inject({
      method: "DELETE",
      url: "/api/v1/users/deactivate",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be successful 200 + body has ok: true
    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.json()).toEqual({ ok: true });

    // Expect the refresh cookie to be cleared
    const setCookies = getSetCookieList(deactivate.headers);
    const cleared = setCookies.some((c) => typeof c === "string" && c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(cleared).toBe(true);

    // Expect the user to be deactivated
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { isActive: true },
    });
    expect(dbUser?.isActive).toBe(false);

    // Any authed endpoint should now be blocked (requireAuth checks isActive)
    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be unsuccessful 403 + body has the message "Account deactivated"
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual({ message: "Account deactivated", code: "ACCOUNT_DEACTIVATED" });

    // Refresh using old cookie should fail (sessions were revoked by deactivateMe)
    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie),
        "x-csrf-token": csrfToken,
      },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Invalid session"
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json()).toEqual({ message: "Invalid session" });

    // Successful login reactivates
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });

    // Expect the response to be successful 200 + body has token
    expect(login.statusCode).toBe(200);

    
    const reactivated = await prisma.user.findUnique({
      where: { email },
      select: { isActive: true },
    });

    // Expect the user to be reactivated
    expect(reactivated?.isActive).toBe(true);
  });

  // Test that the DELETE /users/delete endpoint deletes the user; subsequent authed requests become UNAUTHORIZED and login fails
  it("DELETE /users/delete deletes user; subsequent authed requests become UNAUTHORIZED and login fails", async () => {
    const email = "delete@test.com";
    const password = "Passw0rd!";

    // Register and login the user
    const { token, csrfToken, refreshCookie } = await registerAndLogin(app, email, password);

    // Call /users/delete with the user's token
    const del = await app.inject({
      method: "DELETE",
      url: "/api/v1/users/delete",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be successful 200 + body has ok: true
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ ok: true });

    // User should be gone
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    expect(dbUser).toBeNull();

    // Token still verifies, but user no longer exists -> UNAUTHORIZED
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Unauthorized"
    expect(me.statusCode).toBe(401);
    expect(me.json()).toEqual({ message: "Unauthorized", code: "UNAUTHORIZED" });

    // Refresh should fail (authSession rows should be gone via cascade)
    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: ORIGIN,
        cookie: cookieHeader(REFRESH_COOKIE_NAME, refreshCookie),
        "x-csrf-token": csrfToken,
      },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Invalid session"
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json()).toEqual({ message: "Invalid session" });

    // Login should fail (user missing)
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });

    // Expect the response to be unsuccessful 401 + body has the message "Invalid credentials"
    expect(login.statusCode).toBe(401);
    expect(login.json()).toEqual({ message: "Invalid credentials" });
  });
});
