import { prisma } from "../../lib/prisma.js";

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
  
  // Throws an error if the user doesn’t exist
  return prisma.user.update({
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
}
