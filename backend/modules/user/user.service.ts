import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { userSelect } from "./user.dto.js";
import type { UpdateMeBodyType } from "./user.schemas.js";
import { aiProRequestSummarySelect } from "../pro/pro.dto.js";
import bcrypt from "bcrypt";
import { evaluatePasswordPolicy, formatPasswordPolicyError } from "../auth/password.policy.js";


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
  updateData.currentCompany = normalizeNullableString(data.currentCompany);
  updateData.linkedInUrl = normalizeNullableString(data.linkedInUrl);
  updateData.githubUrl = normalizeNullableString(data.githubUrl);
  updateData.portfolioUrl = normalizeNullableString(data.portfolioUrl);
  updateData.baseResumeUrl = normalizeNullableString(data.baseResumeUrl);

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

/**
 * Change password:
 * - Validate old password is correct
 * - Enforce password policy
 * - Reject if same as current password (basic safety)
 * - Consume token + set new password + revoke all sessions
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  
  // Find the user by id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  });

  // If the user is not found, throw an error
  if (!user) throw new AppError("User not found", 404);

  // Check if the old password is correct
  if (!await bcrypt.compare(oldPassword, user.passwordHash)) throw new AppError("Invalid old password", 400);


  // Enforce the password policy
  const passwordPolicy = evaluatePasswordPolicy(newPassword, user.email);
  if (!passwordPolicy.ok) throw new AppError(formatPasswordPolicyError(passwordPolicy.reasons), 400);

  // Prevent "reset to current password"
  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) throw new AppError("New password must be different from your current password", 400);

  // Hash the new password
  const nextHash = await bcrypt.hash(newPassword, 12);

  // Update the user's password
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: nextHash },
  });

  const ts = new Date();

  // Security: changing password invalidates all refresh sessions
  await prisma.authSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: ts, lastUsedAt: ts },
  });

}

/**
 * Deactivate the current user.
 * 
 * - Sets isActive to false
 * - Revokes all refresh sessions (logout everywhere)
 */
export async function deactivateMe(userId: string) {
  const ts = new Date();

  try {
    await prisma.$transaction(async (db) => {
      
      // Set isActive to false
      await db.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Revoke all refresh sessions (logout everywhere)
      await db.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: ts, lastUsedAt: ts },
      });
    });

  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }
}


/**
 * Permanently delete a user.
 * 
 * - DB relations use onDelete: Cascade, so associated rows are removed automatically.
 * 
 * - TODO: files will remain in GCS, need to delete them manually later (not needed).
 */
export async function forceDeleteUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Gets the latest AI Pro request for a user.
 */
export async function getLatestAiProRequest(userId: string) {
  return prisma.aiProRequest.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    select: aiProRequestSummarySelect,
  });
}
