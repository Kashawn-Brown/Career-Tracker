import { DocumentKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { documentSelect } from "./documents.dto.js";
import type { UploadBaseResumeArgs, CreateApplicationDocumentInput } from "./documents.dto.js";
import { uploadStreamToGcs, deleteGcsObject, isAllowedMimeType } from "../../lib/storage.js";
import { AppError } from "../../errors/app-error.js";



/**
 * Service Layer
 * 
 * Base resume rule:
 * - One BASE_RESUME document per user.
 * - If a new one is added, replace the previous.
 */

// ------------------ BASE RESUME ------------------

/**
 * Uploads a new base resume for the current user.
 * 
 * - The file is uploaded to GCS first, then the metadata is persisted to the database.
 * - url is stored as null (download is via signed URL endpoint when needed).
 */
export async function uploadBaseResume(args: UploadBaseResumeArgs) {
  const { userId, stream, filename, mimeType, isTruncated } = args;

  if (!isAllowedMimeType(mimeType)) {
    throw new AppError(`Unsupported file type: ${mimeType}`, 400);
  }

  const newKey = buildBaseResumeStorageKey(userId, mimeType);

  // Upload to GCS first (so DB never points to a non-existent file)
  const { sizeBytes } = await uploadStreamToGcs({
    storageKey: newKey,
    stream,
    contentType: mimeType,
    isTruncated,
  });

  // Fetch the old key (if any) to delete after the DB commit
  const existing = await prisma.document.findFirst({
    where: { userId, kind: DocumentKind.BASE_RESUME },
    select: { id: true, storageKey: true },
  });

  try {
    // Replace behavior: only one base resume per user
    const created = await prisma.$transaction(async (db) => {
      
      // Delete the old base resume document
      await db.document.deleteMany({
        where: { userId, kind: DocumentKind.BASE_RESUME },
      });

      // Create the new base resume document
      return db.document.create({
        data: {
          userId,
          kind: DocumentKind.BASE_RESUME,
          url: null,
          storageKey: newKey,
          originalName: filename,
          mimeType,
          size: sizeBytes,
        },
        select: documentSelect,
      });
    });

    // Best-effort cleanup: delete the old base resume from GCS if it exists and is not the new one
    if (existing?.storageKey && existing.storageKey !== newKey) {
      await deleteGcsObject(existing.storageKey);
    }

    return created;

  } catch (err) {
    // Compensate: DB failed after upload → delete new blob
    await deleteGcsObject(newKey);
    throw err;
  }
}

/**
 * Gets the base resume document for the current user.
 * 
 * Returns null if none.
 */
export async function getBaseResume(userId: string) {
  return prisma.document.findFirst({
    where: { userId, kind: DocumentKind.BASE_RESUME },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

/**
 * Deletes the base resume document (GCS object + DB row).
 */
export async function deleteBaseResume(userId: string) {
  
  // Find the existing base resume document
  const existing = await prisma.document.findFirst({
    where: { userId, kind: DocumentKind.BASE_RESUME },
    select: { storageKey: true },
  });

  // Delete the document from the database
  await prisma.document.deleteMany({
    where: { userId, kind: DocumentKind.BASE_RESUME },
  });

  // Delete the GCS object if it exists
  if (existing?.storageKey) {
    await deleteGcsObject(existing.storageKey);
  }

  return { ok: true };
}


// ------------------ APPLICATION DOCUMENTS ------------------

/**
 * Counts the documents for a given application.
 */
export async function countApplicationDocuments(userId: string, jobApplicationId: string) {
  return prisma.document.count({
    where: { userId, jobApplicationId },
  });
}

/**
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
 * Delete a document attached to an application.
 * 
 * Ownership verified before calling this function.
 */
export async function deleteDocumentById(userId: string, documentId: string) {
  
  return prisma.$transaction(async (db) => {
    
    const deleted = await db.document.delete({ 
      where: { id: parseInt(documentId), userId },
      select: {jobApplicationId: true},
    });

    // Update the application updatedAt to keep the last updated time.
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




// ------------------ HELPER FUNCTIONS ------------------

function buildBaseResumeStorageKey(userId: string, mimeType: string) {
  const ext = mimeType === "application/pdf" ? ".pdf" : mimeType === "text/plain" ? ".txt" : "";
  const prefix = (process.env.GCS_KEY_PREFIX ?? "").trim();
  const base = `users/${userId}/base-resume/base-resume${ext}`;
  return prefix ? `${prefix}/${base}` : base;
}