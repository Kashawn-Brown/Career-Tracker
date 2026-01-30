import crypto from "node:crypto";
import { AppError } from "../../errors/app-error.js";

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
};

export type GoogleUserInfo = {
  sub: string; // stable Google user id
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

/**
 * Build the Google OAuth authentication URL.
 */
export function buildGoogleAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", args.state);
  url.searchParams.set("code_challenge", args.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/**
 * Exchange a code for an access token.
 */
export async function exchangeCodeForAccessToken(args: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams();
  body.set("code", args.code);
  body.set("client_id", args.clientId);
  body.set("client_secret", args.clientSecret);
  body.set("redirect_uri", args.redirectUri);
  body.set("grant_type", "authorization_code");
  body.set("code_verifier", args.codeVerifier);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new AppError("Google OAuth failed during token exchange.", 400);
  }

  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Fetch Google user info from the Google API.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new AppError("Google OAuth failed while fetching user profile.", 400);
  }

  return (await res.json()) as GoogleUserInfo;
}
