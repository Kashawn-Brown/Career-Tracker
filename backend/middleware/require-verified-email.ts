import type { FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

/**
 * Blocks access for authenticated users who haven't verified their email yet.
 */
export async function requireVerifiedEmail(req: FastifyRequest) {
  const userId = req.user?.id;

  // Should not happen if requireAuth ran first, but keeps this guard safe.
  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });

  // Token may be stale / user deleted.
  if (!user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // If the user's email is not verified, throw an email not verified error
  if (!user.emailVerifiedAt) {
    throw new AppError("Email not verified", 403, "EMAIL_NOT_VERIFIED");
  }
}
