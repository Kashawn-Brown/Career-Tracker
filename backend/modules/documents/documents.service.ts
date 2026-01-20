import { DocumentKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { documentSelect } from "./documents.dto.js";
import type { UploadBaseResumeArgs, UploadApplicationDocumentArgs } from "./documents.dto.js";
import { uploadStreamToGcs, deleteGcsObject, isAllowedMimeType, getSignedReadUrl } from "../../lib/storage.js";
import type { SignedUrlDisposition } from "../../lib/storage.js";
import { AppError } from "../../errors/app-error.js";
import crypto from "node:crypto";

/**
 * Service Layer
 */


/**
 * Fetches a document by ID.
 */
export async function getDocumentById(userId: string, documentId: string) {
  
  // Validate the document id
  const id = Number(documentId);
  if (!Number.isFinite(id)) {
    throw new AppError("Invalid document id.", 400);
  }

  // Fetch the document from the database
  const doc = await prisma.document.findFirst({
    where: { id: parseInt(documentId), userId },
    select: {
      ...documentSelect,
      storageKey: true,
      jobApplicationId: true,
    },
  });

  if (!doc) {
    throw new AppError("Document not found.", 404);
  }

  return doc;
}

/**
 * Gets a short-lived signed download URL for a document by ID.
 */
export async function getDocumentDownloadUrl(args: {
  userId: string;
  documentId: string;
  disposition?: SignedUrlDisposition;
}) {
  const { userId, documentId, disposition } = args;

  const doc = await getDocumentById(userId, documentId);
  if (!doc) {
    throw new AppError("Document not found.", 404);
  }

  const downloadUrl = await getSignedReadUrl({
    storageKey: doc.storageKey,
    filename: doc.originalName ?? "document",
    disposition: disposition ?? "inline",
  });

  return { downloadUrl };
}

/**
 * Deletes a document by ID (GCS object + DB row).
 * 
 * Workflow:
 * 1) delete the document from the database
 * 2) update the application updatedAt (if applicable)
 * 3) delete the GCS object
 */
export async function deleteDocumentById(userId: string, documentId: string) {
  
  // Fetch the document from the database
  const doc = await getDocumentById(userId, documentId);

  // Delete document + update application updatedAt (if applicable)
  const result = await prisma.$transaction(async (db) => {
    
    // Delete the document from the database
    const deleted = await db.document.deleteMany({ 
      where: { id: parseInt(documentId), userId },
    });

    if (deleted.count === 0) {
      throw new AppError("Document not found.", 404);
    }

    // Update the application updatedAt (if applicable)
    if (doc.jobApplicationId) {
      await db.jobApplication.updateMany({
        where: { id: doc.jobApplicationId, userId },
        data: { updatedAt: new Date() },
      });
    }

    return { ok: true };    
  });

  // Delete the GCS object
  await deleteGcsObject(doc.storageKey);

  return result;
}



// ------------------ BASE RESUME ------------------

/**
 * Base resume rule:
 * - One BASE_RESUME document per user.
 */


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
 */
export async function getBaseResume(userId: string) {
  return prisma.document.findFirst({
    where: { userId, kind: DocumentKind.BASE_RESUME },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

/**
 * Deletes the base resume document for the current user.
 */
export async function deleteBaseResume(userId: string) {
  
  // Fetch the document from the database
  const doc = await getBaseResume(userId);
  if (!doc) {
    throw new AppError("Base resume not found.", 404);
  }

  return deleteDocumentById(userId, doc.id.toString());
}

/**
 * Gets the download URL for the base resume for the current user.
 */
export async function getBaseResumeDownloadUrl(userId: string, disposition?: SignedUrlDisposition) {
  const doc = await getBaseResume(userId);
  if (!doc) {
    throw new AppError("Base resume not found.", 404);
  }
  return getDocumentDownloadUrl({ userId, documentId: doc.id.toString(), disposition });
}



// ------------------ APPLICATION DOCUMENTS ------------------

// Maximum number of documents per application
const MAX_DOCS_PER_APPLICATION = 25;

/**
 * Uploads a document and attaches it to an application.
 * 
 * Workflow:
 * 1) validate inputs
 * 2) upload to GCS
 * 3) write DB row (+ update application updatedAt)
 * 4) if DB fails -> delete uploaded object (compensation)
 */
export async function uploadApplicationDocument(args: UploadApplicationDocumentArgs) {
  const { userId, jobApplicationId, kind, stream, filename, mimeType, isTruncated } = args;

  // Just a sanity check to prevent BASE_RESUME from being uploaded to an application
  if (kind === DocumentKind.BASE_RESUME) {
    throw new AppError("BASE_RESUME is not allowed for application attachments.", 400);
  }

  // Guardrail against too many attachments
  const currentCount = await countApplicationDocuments(userId, jobApplicationId);
  if (currentCount >= MAX_DOCS_PER_APPLICATION) {
    throw new AppError(`Document limit reached (${MAX_DOCS_PER_APPLICATION}).`, 400);
  }

  if (!isAllowedMimeType(mimeType)) {
    throw new AppError(`Unsupported file type: ${mimeType}`, 400);
  }

  const storageKey = buildApplicationDocumentStorageKey(userId, jobApplicationId, filename);

  // Upload to GCS first (so DB never points to a non-existent file)
  const { sizeBytes } = await uploadStreamToGcs({
    storageKey,
    stream,
    contentType: mimeType,
    isTruncated,
  });

  try {
    
    // Create the document in the database
    const created = await prisma.$transaction(async (db) => {
    
      const doc = await db.document.create({
        data: {
          userId,
          jobApplicationId,
          kind,
          storageKey,
          originalName: filename,
          mimeType,
          size: sizeBytes,
          url: null,
        },
        select: documentSelect,
      });
  
      // Update the application updatedAt to keep the last updated time.
      const updated = await db.jobApplication.updateMany({
        where: { id: jobApplicationId, userId },
        data: { updatedAt: new Date() },
      });

      if (updated.count === 0) {
        // Important: prevents attaching docs to someone else's application
        throw new AppError("Application not found.", 404);
      }
  
      return doc;
    });

    return created;
    
  } catch (err) {
    // DB failed after upload -> delete blob (compensation)
    await deleteGcsObject(storageKey);
    throw err;
  }
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
 * Counts the number of documents for a given application.
 */
export async function countApplicationDocuments(userId: string, jobApplicationId: string) {
  return prisma.document.count({
    where: { userId, jobApplicationId },
  });
}



// ------------------ HELPER FUNCTIONS ------------------


// Helper function to build a storage key for the base resume
function buildBaseResumeStorageKey(userId: string, mimeType: string) {
  const ext = mimeType === "application/pdf" ? ".pdf" : mimeType === "text/plain" ? ".txt" : "";
  const prefix = (process.env.GCS_KEY_PREFIX ?? "").trim();
  const base = `users/${userId}/base-resume/base-resume${ext}`;
  return prefix ? `${prefix}/${base}` : base;
}

// Helper function to build a storage key for a document
function buildApplicationDocumentStorageKey(userId: string, applicationId: string, originalName: string) {
  const id = crypto.randomUUID();

  const dot = originalName.lastIndexOf(".");
  const ext = dot !== -1 ? originalName.slice(dot).toLowerCase() : "";
  const safeExt = ext.length > 0 && ext.length <= 10 ? ext : "";

  // Get the key prefix from the environment variable
  const prefix = (process.env.GCS_KEY_PREFIX ?? "").trim();
  const base = `users/${userId}/applications/${applicationId}/${id}${safeExt}`;

  // If prefix is set (dev/prod), keep keys clearly separated.
  return prefix ? `${prefix}/${base}` : base;
}