import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { userSelect } from "./user.dto.js";

/**
 * Service layer: DB reads/writes for user profile.
 */


/**
 * Fetches a user.
 * Requires JWT
 */
export async function getMe(userId: string) {

  // Returns null if user not found
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
}


/**
 * Updates the current user record and returns the updated profile.
 * Requires JWT
 */
export async function updateMe(userId: string, data: { name?: string }) {  // for now, we only allow updating name
  try {
    // Throws an error if the user doesn’t exist
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
} catch (err) {
  // If the user was deleted (or id doesn't exist), Prisma throws P2025
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    throw new AppError("User not found", 404);
  }
  throw err;
}
}
