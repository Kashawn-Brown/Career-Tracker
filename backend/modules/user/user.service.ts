import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { userSelect } from "./user.dto.js";
import type { UpdateMeBodyType } from "./user.schemas.js";

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
export async function updateMe(userId: string, data: UpdateMeBodyType) {  
  // Normalize strings so whitespace-only becomes null (for nullable fields).

  // Start with an empty update object
  const updateData: Prisma.UserUpdateInput = {};

  // Handle name separately (because it’s required/non-null)
  if (data.name !== undefined) {
    const trimmed = data.name.trim();

    if (trimmed.length === 0) throw new AppError("Name cannot be empty", 400);
    
    updateData.name = trimmed;
  }

  // Helper to normalize nullable string fields
  const normalizeNullableString = (value: string | undefined) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  // Apply normalization to nullable fields
  updateData.location = normalizeNullableString(data.location);
  updateData.currentRole = normalizeNullableString(data.currentRole);
  updateData.linkedInUrl = normalizeNullableString(data.linkedInUrl);
  updateData.githubUrl = normalizeNullableString(data.githubUrl);
  updateData.portfolioUrl = normalizeNullableString(data.portfolioUrl);

  // Clean and deduplicate skills if provided
  if (data.skills !== undefined) {
    // Trim each skill; drop empties; keep order; remove duplicates.
    const cleaned = data.skills
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    updateData.skills = Array.from(new Set(cleaned));
  }

  // Job search preferences (AI foundation)
  updateData.jobSearchTitlesText = normalizeNullableString(data.jobSearchTitlesText);
  updateData.jobSearchLocationsText = normalizeNullableString(data.jobSearchLocationsText);
  updateData.jobSearchKeywordsText = normalizeNullableString(data.jobSearchKeywordsText);
  updateData.jobSearchSummary = normalizeNullableString(data.jobSearchSummary);

  if (data.jobSearchWorkMode !== undefined) {
    updateData.jobSearchWorkMode = data.jobSearchWorkMode;
  }

  // Run the database update
  try {
    // Throws an error if the user doesn’t exist
    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
