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

    const controller = createAbortControllerFromRawRequest(req.raw);
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
        isTruncated: (data.file as any).truncated === true,
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

}