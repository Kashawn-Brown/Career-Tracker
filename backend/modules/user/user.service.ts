import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";

/**
 * Service layer: DB reads/writes for user profile.
 */


// Fetches one user row by primary key (userId)
export async function getMe(userId: string) {

  // Returns null if user not found
  return prisma.user.findUnique({
    where: { id: userId },
    
    // Only returns these columns
    select: {
      id: true,
      email: true,
      name: true,
      baseResumeUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Updates the current user record and returns the updated profile.
export async function updateMe(userId: string, data: { name?: string }) {  // for now, we only allow updating name
  try {
    // Throws an error if the user doesn’t exist
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        baseResumeUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
} catch (err) {
  // If the user was deleted (or id doesn't exist), Prisma throws P2025
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    throw new AppError("User not found", 404);
  }
  throw err;
}
}
