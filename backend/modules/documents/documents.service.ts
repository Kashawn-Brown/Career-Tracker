import { DocumentKind, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { documentSelect } from "./documents.dto.js";
import type { upsertBaseResumeInput } from "./documents.dto.js";


/**
 * Service Layer
 * 
 * Base resume rule:
 * - One BASE_RESUME document per user.
 * - If a new one is added, replace the previous.
 * - Keep User.baseResumeUrl in sync for quick access.
 */


/**
 * Creates/Updates the base resume for the current user.
 * Requires JWT.
 */
export async function upsertBaseResume(userId: string, input: upsertBaseResumeInput) {
  
  // Need to use transaction to do multiple db operations at once
  // 1. delete old base resume -> 2. create the new base resume -> 3. update users.baseResumeUrl
  return prisma.$transaction(async (db: Prisma.TransactionClient) => {
    
    // Delete existing base resume doc
    await db.document.deleteMany({
      where: { userId, kind: DocumentKind.BASE_RESUME },
    });


    // Create the new document 
    const created = await db.document.create({
      data: {
        userId,
        kind: DocumentKind.BASE_RESUME,
        url: input.url,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        storageKey: input.storageKey ?? `base-resume/${userId}`,   // If not provided yet, just store something predictable for now.
      },
      select: documentSelect,
    });

    // Keep a convenient pointer on the user row
    await db.user.update({
      where: { id: userId },
      data: { baseResumeUrl: input.url },
    });

    return created;
  });
}

/**
 * Gets the base resume document for the current user.
 * Null if none.
 * Requires JWT.
 */
export async function getBaseResume(userId: string) {
  return prisma.document.findFirst({
    where: { userId, kind: DocumentKind.BASE_RESUME },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

/**
 * Removes the base resume document for the current user.
 * Requires JWT.
 */
export async function deleteBaseResume(userId: string) {
  return prisma.$transaction(async (db) => {
    await db.document.deleteMany({
      where: { userId, kind: DocumentKind.BASE_RESUME },
    });

    // remove the users pointer to the base resume as there is now none
    await db.user.update({
      where: { id: userId },
      data: { baseResumeUrl: null },
    });

    return { ok: true };
  });
}
