import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../errors/app-error.js";

/**
 * Auth HTTP boundary helpers.
 * Keeps cookies/origin/csrf parsing out of routes so routes stay readable.
 */

const REFRESH_COOKIE_NAME = "career_tracker_refresh";

const AUTH_PATH = "/api/v1/auth";

function isProd() {
  return process.env.NODE_ENV === "production";
}


function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
  
export function setRefreshCookie(reply: FastifyReply, refreshToken: string, expiresAt?: Date) {
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: AUTH_PATH,
  };

  // If expiresAt is provided, make it a persistent cookie.
  if (expiresAt) options.expires = expiresAt;

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, options);
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: AUTH_PATH,
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
  } as any);
}

export function getRefreshCookie(req: FastifyRequest): string | null {
  const cookies = (req as any).cookies;
  const token = cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === "string" ? token : null;
}

/**
 * Strict Origin check for cookie-auth endpoints (refresh/logout).
 * We’ll wire this in starting A3.
 */
export function assertAllowedOrigin(req: FastifyRequest) {
  const origin = req.headers.origin;

  // In prod we require Origin; in local we tolerate missing Origin (curl, etc.)
  if (!origin) {
    if (isProd()) throw new AppError("Missing Origin", 403);
    return;
  }
  if (typeof origin !== "string") throw new AppError("Invalid Origin", 403);

  const allowed = getAllowedOrigins();
  if (!allowed.includes(origin)) throw new AppError("Origin not allowed", 403);
}

/**
 * CSRF header extraction (refresh/logout).
 * We’ll wire this in starting A3.
 */
export function getCsrfHeader(req: FastifyRequest): string {
  const raw = req.headers["x-csrf-token"];
  if (!raw || typeof raw !== "string") throw new AppError("Missing CSRF token", 403);
  if (raw.length < 10 || raw.length > 500) throw new AppError("Invalid CSRF token", 403);
  return raw;
}

/**
 * Ensures we never return refreshToken or expiresAt in JSON.
 */
export function toSafeAuthResponse<T extends Record<string, any>>(result: T) {
  const { refreshToken: _refreshToken, expiresAt: _expiresAt, ...safe } = result;
  return safe;
}

/**
 * Rate limit key by IP.
 */
export function rateLimitKeyByIp(req: FastifyRequest): string {
  return req.ip;
}

/**
 * Rate limit key by IP and email.
 */
export function rateLimitKeyByIpAndEmail(req: FastifyRequest): string {
  const ip = req.ip;

  const emailRaw = (req as any).body?.email;
  const email =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";

  return email ? `${ip}:${email}` : ip;
}
