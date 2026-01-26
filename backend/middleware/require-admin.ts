import type { FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

/**
 * Blocks access to admin endpoints if the user is not an admin.
 * Assumes requireAuth ran first.
 */
export async function requireAdmin(req: FastifyRequest) {

  // Get the user ID from the request
  const userId = req.user?.id;

  if (!userId) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  
  // Find the user by ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  // If the user is not found, throw an unauthorized error
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  // If the user is not an admin, throw a forbidden error
  if (!user.isAdmin) throw new AppError("Forbidden", 403, "ADMIN_FORBIDDEN");
}
