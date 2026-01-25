import type { FastifyInstance } from "fastify";
import { RegisterBody, LoginBody, EmptyBody, VerifyEmailBody, ResendVerificationBody } from "./auth.schemas.js";
import type { RegisterBodyType, LoginBodyType, EmptyBodyType, VerifyEmailBodyType, ResendVerificationBodyType } from "./auth.schemas.js";
import * as AuthService from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { setRefreshCookie, toSafeAuthResponse, assertAllowedOrigin, getCsrfHeader, clearRefreshCookie, rateLimitKeyByIp, rateLimitKeyByIpAndEmail } from "./auth.http.js";
import { AppError } from "../../errors/app-error.js";

export async function authRoutes(app: FastifyInstance) {

  /**
   * User Register.
   * 
   * - Register the user
   * - Set the refresh token in a cookie
   * - Return the safe auth response
   */
  app.post(
    "/register",
    { 
      schema: { body: RegisterBody }, 
      config: { rateLimit: { max: 5, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIpAndEmail } }

    },
    async (req, reply) => {

      // Map request body to schema
      const body = req.body as RegisterBodyType;

      // Retrieve token and return token from successful register
      const result = await AuthService.register(body.email, body.password, body.name);

      // Set the refresh token in a cookie
      setRefreshCookie(reply, result.refreshToken, result.expiresAt);

      const safe = toSafeAuthResponse(result);

      // Return the safe auth response
      return reply.status(201).send(safe);
    }
  );

  /**
   * User Login.
   * 
   * - Login the user
   * - Set the refresh token in a cookie
   * - Return the safe auth response
   */
  app.post(
    "/login",
    { 
      schema: { body: LoginBody }, 
      config: { rateLimit: { max: 10, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIpAndEmail } }
    },
    async (req, reply) => {

      const body = req.body as LoginBodyType;

      // Retrieve token and return token from successful login
      const result = await AuthService.login(body.email, body.password);
      
      // Put refresh token in an httpOnly cookie
      setRefreshCookie(reply, result.refreshToken, result.expiresAt);

      const safe = toSafeAuthResponse(result);

      // Return the safe auth response
      return reply.send(safe);
    }
  );


  //---------------- SESSIONS/REFRESH TOKENS ----------------

  // Refresh cookie name
  const REFRESH_COOKIE_NAME = "career_tracker_refresh";

  /**
   * Get the CSRF token.
   * 
   * - Get the refresh token from the cookie
   * - Bootstrap the CSRF token
   * - Return the CSRF token
   */
  app.get(
    "/csrf", 
    { 
      config: { rateLimit: { max: 30, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } }
    },
    async (req, reply) => {
    
    // Make sure the request is coming from an allowed origin
    assertAllowedOrigin(req);

    const refresh = (req as any).cookies?.[REFRESH_COOKIE_NAME];
    if (!refresh) return reply.send({ csrfToken: null });

    const res = await AuthService.bootstrapCsrf(refresh);
    return reply.send(res);
  });

  /**
   * Refresh access token + rotate refresh token + rotate CSRF token.
   * 
   * - Get the refresh token from the cookie
   * - Get the CSRF token from the header
   * - Refresh the session
   * - Set the refresh token in a cookie
   * - Return the safe auth response
   */
  app.post(
    "/refresh", 
    { 
      config: { rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } }
    },
    async (req, reply) => {
    assertAllowedOrigin(req);

    const refresh = (req as any).cookies?.[REFRESH_COOKIE_NAME];
    if (!refresh) throw new AppError("Missing session", 401);

    const csrf = getCsrfHeader(req);

    const res = await AuthService.refreshSession(refresh, csrf);

    // Rotate refresh cookie (httpOnly)
    setRefreshCookie(reply, res.refreshToken, res.expiresAt);

    const safe = toSafeAuthResponse(res);

    return reply.send(safe);
  });

  /**
   * Logout: revoke refresh session and clear cookie.
   * 
   * - Get the refresh token from the cookie
   * - Get the CSRF token from the header
   * - Revoke the session
   * - Clear the refresh token in a cookie
   * - Return the success response
   */
  app.post(
    "/logout", 
    { 
      config: { rateLimit: { max: 30, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } }
    },
    async (req, reply) => {
    assertAllowedOrigin(req);

    const refresh = (req as any).cookies?.[REFRESH_COOKIE_NAME];
    const csrf = getCsrfHeader(req);

    if (refresh) {
      await AuthService.logoutSession(refresh, csrf);
    }

    clearRefreshCookie(reply);

    return reply.send({ ok: true });
  });


  //---------------- EMAIL VERIFICATION ----------------

  /**
   * Verify email (token-based).
   */
  app.post(
    "/verify-email",
    {
      schema: { body: VerifyEmailBody },
      config: { rateLimit: { max: 20, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } },
    },
    async (req, reply) => {
      const body = req.body as VerifyEmailBodyType;
      await AuthService.verifyEmail(body.token);
      return reply.send({ ok: true });
    }
  );

  /**
   * Resend verification email (non-enumerating).
   */
  app.post(
    "/resend-verification",
    {
      schema: { body: ResendVerificationBody },
      config: { rateLimit: { max: 3, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIpAndEmail } },
    },
    async (req, reply) => {
      const body = req.body as ResendVerificationBodyType;
      await AuthService.resendVerificationEmail(body.email);
      return reply.send({ ok: true });
    }
  );
  


  /**
   * User Me route (Protected by middleware; proves JWT works).
   */
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.user };
  });
}
