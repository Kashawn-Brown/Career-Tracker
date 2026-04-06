import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { AppError } from "../../errors/app-error.js";
import * as DocumentsService from "./documents.service.js";
import { DocumentIdParams, DocumentDownloadQuery } from "./documents.schemas.js";
import type { DocumentIdParamsType, DocumentDownloadQueryType } from "./documents.schemas.js";
import * as UserService from "../user/user.service.js";
import { createAbortControllerFromRawRequest, isAbortError } from "../../lib/request-abort.js";


export async function documentsRoutes(app: FastifyInstance) {

  /**
   * Get a short-lived signed download URL for a document.
   */
    app.get(
      "/:id/download",
      {
        preHandler: [requireAuth, requireVerifiedEmail],
        schema: { params: DocumentIdParams, query: DocumentDownloadQuery },
      },
      async (req) => {
  
        const userId = req.user!.id;
        const { id } = req.params as DocumentIdParamsType;
        const { disposition } = req.query as DocumentDownloadQueryType;
  
        const downloadUrl = await DocumentsService.getDocumentDownloadUrl({
          userId,
          documentId: id,
          disposition,
        });
  
        return downloadUrl;
      }
    );

    /**
     * Delete a document by ID (GCS object + DB row).
     */
    app.delete(
      "/:id",
      {
        preHandler: [requireAuth, requireVerifiedEmail],
        schema: { params: DocumentIdParams },
      },
      async (req) => {
        const userId = req.user!.id;
        const { id } = req.params as DocumentIdParamsType;

        return DocumentsService.deleteDocumentById(userId, id);
      }
    );


  // ---------------- BASE RESUME ----------------
  
  
  /**
   * Gets the current base resume for the current user.
   */
  app.get("/base-resume", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req) => {
    const userId = req.user!.id;
    const doc = await DocumentsService.getBaseResume(userId);
    return { baseResume: doc };
  });

  /**
   * Create/replace the base resume file for the current user.
   */
  app.post("/base-resume", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req, reply) => {

    const controller = createAbortControllerFromRawRequest(req.raw, reply.raw);
    const { signal } = controller;

    try {

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
        isTruncated: (data as any).truncated === true,
        signal,
      });

      // Update the user's base resume URL in the database
      await UserService.updateMe(userId, {
        baseResumeUrl: created.url ?? undefined,
      });

      return reply.status(201).send({ baseResume: created });
    } catch (err) {
      if (signal.aborted || isAbortError(err)) return;
      throw err;
    }
  });

  /**
   * Delete base resume for the current user.
   */
  app.delete("/base-resume", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req) => {
    const userId = req.user!.id;

    await DocumentsService.deleteBaseResume(userId);

    // Update the user's base resume URL in the database
    await UserService.updateMe(userId, {
      baseResumeUrl: undefined,
    });

    return { ok: true };
  });

  /**
   * Gets the download URL for the base resume for the current user.
   */
  app.get("/base-resume/download", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req) => {
    const userId = req.user!.id;
    const { disposition } = req.query as DocumentDownloadQueryType;
    const downloadUrl = await DocumentsService.getBaseResumeDownloadUrl(userId, disposition);
    return downloadUrl;
  });


  // ─── Base cover letter template routes ───────────────────────────────────────
  // Same structure as base resume: GET to fetch metadata, POST to upload/replace,
  // DELETE to remove. One template per user — uploading replaces the existing one.

  /**
   * GET /documents/base-cover-letter
   * Returns the stored base cover letter template metadata, or null if none saved.
   */
  app.get("/base-cover-letter", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req) => {
    const userId = req.user!.id;
    const doc    = await DocumentsService.getBaseCoverLetter(userId);

    if (doc) {
      // Strip storageKey — it's an internal GCS path, never sent to clients
      const { storageKey: _sk, ...rest } = doc as typeof doc & { storageKey: string };
      return { baseCoverLetter: rest };
    }
    return { baseCoverLetter: null };
  });

  /**
   * POST /documents/base-cover-letter
   * Uploads or replaces the user's base cover letter template.
   * Accepts multipart/form-data with a single "file" field (.pdf, .txt, .docx).
   */
  app.post("/base-cover-letter", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req, reply) => {
    const userId = req.user!.id;

    const data = await req.file();
    if (!data) throw new AppError("No file uploaded.", 400);

    const created = await DocumentsService.uploadBaseCoverLetter({
      userId,
      stream:      data.file,
      filename:    data.filename,
      mimeType:    data.mimetype,
      isTruncated: (data as any).truncated === true,
    });

    // Strip storageKey before sending to client
    const { storageKey: _sk, ...rest } = created as typeof created & { storageKey: string };
    return reply.status(201).send({ baseCoverLetter: rest });
  });

  /**
   * DELETE /documents/base-cover-letter
   * Deletes the stored template from GCS and the DB.
   */
  app.delete("/base-cover-letter", { preHandler: [requireAuth, requireVerifiedEmail] }, async (req) => {
    const userId = req.user!.id;
    await DocumentsService.deleteBaseCoverLetter(userId);
    return { ok: true };
  });

}