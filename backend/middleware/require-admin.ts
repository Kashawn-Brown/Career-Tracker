import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";
import { UserRole } from "@prisma/client";

/**
 * Middleware: blocks requests from non-admin users.
 * Checks user.role === ADMIN (source of truth for admin access).
 * Must be used after requireAuth (relies on req.user being set).
 */
export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply) {

  // Get the user ID from the request
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  // Find the user by ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // If the user is not found, throw an unauthorized error
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  // If the user is not an admin, throw a forbidden error
  if (user.role !== UserRole.ADMIN) {
    throw new AppError("Admin access required", 403, "ADMIN_FORBIDDEN");
  }
}