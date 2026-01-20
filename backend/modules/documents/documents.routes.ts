import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError } from "../../errors/app-error.js";
import * as DocumentsService from "./documents.service.js";
import { getGcsConfig, getStorageClient } from "../../lib/gcs.js";
import { DocumentIdParams, DocumentDownloadQuery } from "./documents.schemas.js";
import type { DocumentIdParamsType, DocumentDownloadQueryType } from "./documents.schemas.js";


export async function documentsRoutes(app: FastifyInstance) {

  /**
   * Gets the current base resume for the current user.
   */
  app.get("/base-resume", { preHandler: [requireAuth] }, async (req) => {
    const userId = req.user!.id;
    const doc = await DocumentsService.getBaseResume(userId);
    return { baseResume: doc };
  });

  /**
   * Create/replace the base resume file for the current user.
   */
  app.post("/base-resume", { preHandler: [requireAuth] }, async (req, reply) => {
      const userId = req.user!.id;

      // Get the file from the request
      const data = await req.file();
      if (!data) {
        throw new AppError("No file uploaded.", 400);
      }

      const created = await DocumentsService.uploadBaseResume({
        userId,
        stream: data.file,
        filename: data.filename,
        mimeType: data.mimetype,
        
        // If the file is too large, fastify-multipart sets truncated to true
        isTruncated: (data.file as any).truncated === true,
      });

      return reply.status(201).send({ baseResume: created });
    }
  );

  /**
   * Delete base resume for the current user.
   */
  app.delete("/base-resume", { preHandler: [requireAuth] }, async (req) => {
    const userId = req.user!.id;
    return DocumentsService.deleteBaseResume(userId);
  });

  /**
   * Get a short-lived signed download URL for an application document.
   */
  app.get(
    "/:id/download",
    {
      preHandler: [requireAuth],
      schema: { params: DocumentIdParams, querystring: DocumentDownloadQuery },
    },
    async (req) => {

      const userId = req.user!.id;
      const { id } = req.params as DocumentIdParamsType;

      const doc = await DocumentsService.getApplicationDocumentById(userId, id);

      const cfg = getGcsConfig();
      const bucket = getStorageClient().bucket(cfg.bucketName);

      // Get the disposition from the query string
      const { disposition = "inline" } = (req.query as DocumentDownloadQueryType) ?? {};

      // Build the safe name for the document
      const safeName = (doc.originalName ?? "document")
      .replace(/[\r\n"]/g, "")
      .slice(0, 150);

      const [downloadUrl] = await bucket.file(doc.storageKey).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + cfg.signedUrlTtlSeconds * 1000,
        // Controls “open in browser” vs “force download”
        responseDisposition: `${disposition}; filename="${safeName}"`,
      });

      return { downloadUrl };
    }
  );
  
  /**
   * Delete an application document (GCS object + DB row).
   */
  app.delete(
    "/:id",
    {
      preHandler: [requireAuth],
      schema: { params: DocumentIdParams },
    },
    async (req) => {
      const userId = req.user!.id;
      const { id } = req.params as DocumentIdParamsType;

      const doc = await DocumentsService.getApplicationDocumentById(userId, id);

      const cfg = getGcsConfig();
      const bucket = getStorageClient().bucket(cfg.bucketName);

      // Best-effort object deletion (ignore if already gone)
      await bucket.file(doc.storageKey).delete({ ignoreNotFound: true });

      return DocumentsService.deleteDocumentById(userId, id);
    }
  );


  // ---------------- HELPER FUNCTIONS ----------------


  // Helper function to check if a mime type is allowed
  function mimeAllowed(allowed: unknown, mimetype: string) {
    if (Array.isArray(allowed)) return allowed.includes(mimetype);
    if (allowed instanceof Set) return allowed.has(mimetype);
    return false;
}

// Helper function to build a deterministic storage key for the base resume
function buildBaseResumeStorageKey(userId: string, mimetype: string) {
  const ext = mimetype === "application/pdf" ? ".pdf" : mimetype === "text/plain" ? ".txt" : "";

  const prefix = (process.env.GCS_KEY_PREFIX ?? "").trim();
  const base = `users/${userId}/base-resume/base-resume${ext}`;

  return prefix ? `${prefix}/${base}` : base;
}

// Helper function to count the number of bytes in a stream
function createByteCounter() {
  let bytes = 0;

  const stream = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length;
      cb(null, chunk);
    },
  });

  return { stream, getBytes: () => bytes };
}



}