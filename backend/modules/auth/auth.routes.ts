import type { FastifyInstance } from "fastify";
import { RegisterBody, LoginBody } from "./auth.schemas.js";
import type { RegisterBodyType, LoginBodyType } from "./auth.schemas.js";
import * as AuthService from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";

const REFRESH_COOKIE_NAME = "career_tracker_refresh";

// Local dev can't use Secure + SameSite=None on http://localhost,
// but prod must use Secure + SameSite=None for cross-site cookies.
/**
 * Get the refresh cookie options.
 */
function getRefreshCookieOptions(expiresAt: Date) {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/v1/auth",
    expires: expiresAt,
  } as const;
}


export async function authRoutes(app: FastifyInstance) {

  /**
   * User Register.
   */
  app.post(
    "/register",
    { 
      schema: { body: RegisterBody }, 
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } } 
    },
    async (req, reply) => {

      // Map request body to schema
      const body = req.body as RegisterBodyType;

      // Retrieve token and return token from successful register
      const result = await AuthService.register(body.email, body.password, body.name);

      // Put refresh token in an httpOnly cookie (never in JSON response)
      reply.setCookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        getRefreshCookieOptions(result.expiresAt)
      );
      // Strip refreshToken before returning to client
      const { refreshToken: _refresh, ...safe } = result;

      return reply.status(201).send(safe);
    }
  );

  /**
   * User Login.
   */
  app.post(
    "/login",
    { 
      schema: { body: LoginBody }, 
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } } 
    },
    async (req, reply) => {

      const body = req.body as LoginBodyType;

      // Retrieve token and return token from successful login
      const result = await AuthService.login(body.email, body.password);
      
      // Put refresh token in an httpOnly cookie (never in JSON response)
      reply.setCookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        getRefreshCookieOptions(result.expiresAt)
      );
      // Strip refreshToken before returning to client
      const { refreshToken: _refresh, expiresAt: _expiresAt, ...safe } = result;

      return reply.send(safe);
    }
  );

  // 
  /**
   * User Me route (Protected by middleware; proves JWT works).
   */
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.user };
  });
}
