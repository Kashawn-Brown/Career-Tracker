import { DocumentKind, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { documentSelect } from "./documents.dto.js";
import type { upsertBaseResumeInput, CreateApplicationDocumentInput } from "./documents.dto.js";
import { AppError } from "../../errors/app-error.js";



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


/**
 * Documents v1:
 * Counts the documents for a given application.
 */
export async function countApplicationDocuments(userId: string, jobApplicationId: string) {
  return prisma.document.count({
    where: { userId, jobApplicationId },
  });
}

/**
 * Documents v1:
 * Lists the documents for a given application.
 */
export async function listApplicationDocuments(userId: string, jobApplicationId: string) {
  return prisma.document.findMany({
    where: { userId, jobApplicationId },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

/**
 * Documents v1:
 * Creates a new document for a given application.
 */
export async function createApplicationDocument(
  userId: string,
  jobApplicationId: string,
  input: CreateApplicationDocumentInput
) {
  if (input.kind === DocumentKind.BASE_RESUME) {
    throw new AppError("BASE_RESUME is not allowed for application attachments.", 400);
  }

  return prisma.$transaction(async (db) => {
    
    const created = await db.document.create({
      data: {
        userId,
        jobApplicationId,
        kind: input.kind,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        url: null,
      },
      select: documentSelect,
    });

    // Update the application updatedAt to keep the last updated time.
    const result = await db.jobApplication.updateMany({
      where: { id: jobApplicationId, userId },
      data: { updatedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AppError("Application not found", 404);
    }

    return created;
  });
}

/**
 * Documents v1:
 * Fetch an application-attached document owned by the user.
 * (Excludes BASE_RESUME and requires jobApplicationId.)
 */
export async function getApplicationDocumentById(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: parseInt(documentId),
      userId,
      jobApplicationId: { not: null },
      kind: { not: DocumentKind.BASE_RESUME },
    },
    select: {
      ...documentSelect,
      storageKey: true,
      jobApplicationId: true,
    },
  });

  if (!doc) {
    throw new AppError("Document not found.", 404);
  }

  if (!doc.storageKey) {
    // Should never happen for application uploads, but keeps the behavior safe.
    throw new AppError("Document is missing storageKey.", 500);
  }

  return doc;
}

/**
 * Documents v1:
 * Delete the document row (ownership already verified before calling this).
 */
export async function deleteDocumentById(userId: string, documentId: string) {
  
  return prisma.$transaction(async (db) => {
    
    const deleted = await db.document.delete({ 
      where: { id: parseInt(documentId), userId },
      select: {jobApplicationId: true},
    });

    // Only "touch" application if this doc belongs to one.
    if (deleted.jobApplicationId) {
      
      const result = await db.jobApplication.updateMany({
        where: { id: deleted.jobApplicationId, userId },
        data: { updatedAt: new Date() },
      });

      if (result.count === 0) {
        throw new AppError("Application not found", 404);
      }
    }

    return { ok: true };    
  });
}


