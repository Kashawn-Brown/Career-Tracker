import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import { assertAiAccessOrThrow } from "../modules/ai/ai-access.js";

/**
 * Blocks access to AI endpoints if the user has exhausted free quota and is not Pro.
 * Assumes requireAuth ran first.
 */
export async function requireAiAccess(req: FastifyRequest) {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  await assertAiAccessOrThrow(userId);
}
