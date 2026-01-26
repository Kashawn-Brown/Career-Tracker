import type { FastifyRequest } from "fastify";
import { AppError } from "../../errors/app-error.js";

/**
 * Pro module HTTP helpers (keeps routes clean).
 */

/**
 * Requires admin API key in headers.
 */
export async function requireAdminApiKey(req: FastifyRequest) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) throw new AppError("Server misconfigured", 500);

  const raw = req.headers["x-admin-api-key"];
  if (!raw || typeof raw !== "string") {
    throw new AppError("Unauthorized", 401, "ADMIN_UNAUTHORIZED");
  }

  if (raw !== expected) {
    throw new AppError("Unauthorized", 401, "ADMIN_UNAUTHORIZED");
  }
}

/**
 * Rate limit key generator (per-user when authed).
 */
export function rateLimitKeyByUser(req: FastifyRequest): string {
  return req.user?.id ?? req.ip;
}
