import type { FastifyInstance } from "fastify";
import { AppError } from "../../errors/app-error.js";
import { rateLimitKeyByIp } from "../auth/auth.http.js";
import { setRefreshCookie } from "../auth/auth.http.js";
import { GoogleOAuthCallbackQuery } from "./oauth.schemas.js";
import { buildGoogleAuthUrl, createOAuthState, createPkcePair, exchangeCodeForAccessToken, fetchGoogleUserInfo } from "./oauth.google.js";
import { clearGoogleOAuthCookies, getFrontendBaseUrl, readGoogleOAuthCookies, setGoogleOAuthCookies } from "./oauth.http.js";
import * as OAuthService from "./oauth.service.js";

export async function oauthRoutes(app: FastifyInstance) {
  

  /**
   * Initiate Google OAuth flow.
   */
  app.get(
    "/google/start",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } } },
    async (_req, reply) => {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new AppError("Google OAuth is not configured on the server.", 500);
      }

      const state = createOAuthState();
      const { codeVerifier, codeChallenge } = createPkcePair();

      setGoogleOAuthCookies(reply, state, codeVerifier);

      const url = buildGoogleAuthUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge,
      });

      return reply.redirect(url);
    }
  );

  /**
   * Handle Google OAuth callback.
   */
  app.get(
    "/google/callback",
    {
      schema: { querystring: GoogleOAuthCallbackQuery },
      config: { rateLimit: { max: 30, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } },
    },
    async (req, reply) => {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new AppError("Google OAuth is not configured on the server.", 500);
      }

      const frontend = getFrontendBaseUrl();
      const { code, state, error } = req.query as any;

      // Always clear short-lived cookies on callback
      clearGoogleOAuthCookies(reply);

      if (error) return reply.redirect(`${frontend}/login?oauth=cancelled`);
      if (!code || !state) return reply.redirect(`${frontend}/login?oauth=failed`);

      const { state: cookieState, codeVerifier } = readGoogleOAuthCookies(req);

      if (!cookieState || cookieState !== state) return reply.redirect(`${frontend}/login?oauth=failed`);
      if (!codeVerifier) return reply.redirect(`${frontend}/login?oauth=failed`);

      const tokenRes = await exchangeCodeForAccessToken({
        code,
        codeVerifier,
        clientId,
        clientSecret,
        redirectUri,
      });

      const profile = await fetchGoogleUserInfo(tokenRes.access_token);

      const user = await OAuthService.loginWithGoogle(profile);
      const session = await OAuthService.createSessionForUser(user.id);

      setRefreshCookie(reply, session.refreshToken, session.expiresAt);

      return reply.redirect(`${frontend}/oauth/callback`);
    }
  );
}
