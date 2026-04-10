import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import { assertCreditAccessOrThrow } from "../modules/plans/entitlement-policy.js";

/**
 * Pre-handler guard for all AI endpoints.
 * Blocks execution if the user has exhausted their monthly credit allowance.
 * Assumes requireAuth ran first (req.user is set).
 */
export async function requireAiAccess(req: FastifyRequest) {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  await assertCreditAccessOrThrow(userId);
}