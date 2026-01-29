import type { FastifyReply, FastifyRequest } from "fastify";

function isProd() {
  return process.env.NODE_ENV === "production";
}

// Scope these cookies tightly to just the Google OAuth endpoints.
const OAUTH_GOOGLE_PATH = "/api/v1/auth/oauth/google";

export const GOOGLE_OAUTH_STATE_COOKIE = "career_tracker_google_oauth_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "career_tracker_google_oauth_verifier";

// Set the Google OAuth cookies.
export function setGoogleOAuthCookies(reply: FastifyReply, state: string, codeVerifier: string) {
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: OAUTH_GOOGLE_PATH,
    maxAge: 10 * 60, // 10 minutes (seconds)
  };

  reply.setCookie(GOOGLE_OAUTH_STATE_COOKIE, state, options);
  reply.setCookie(GOOGLE_OAUTH_VERIFIER_COOKIE, codeVerifier, options);
}

// Read the Google OAuth cookies.
export function readGoogleOAuthCookies(req: FastifyRequest): { state: string | null; codeVerifier: string | null } {
  const cookies = (req as any).cookies ?? {};
  const state = typeof cookies[GOOGLE_OAUTH_STATE_COOKIE] === "string" ? cookies[GOOGLE_OAUTH_STATE_COOKIE] : null;
  const codeVerifier =
    typeof cookies[GOOGLE_OAUTH_VERIFIER_COOKIE] === "string" ? cookies[GOOGLE_OAUTH_VERIFIER_COOKIE] : null;

  return { state, codeVerifier };
}

// Clear the Google OAuth cookies.
export function clearGoogleOAuthCookies(reply: FastifyReply) {
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: OAUTH_GOOGLE_PATH,
  };

  reply.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, options as any);
  reply.clearCookie(GOOGLE_OAUTH_VERIFIER_COOKIE, options as any);
}

// Get the frontend base URL.
export function getFrontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
