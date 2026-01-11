import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { UpsertBaseResumeBody } from "./documents.schemas.js";
import type { UpsertBaseResumeBodyType } from "./documents.schemas.js";
import * as DocumentsService from "./documents.service.js";
import { getGcsConfig, getStorageClient } from "../../lib/gcs.js";
import { DocumentIdParams, DocumentDownloadQuery } from "./documents.schemas.js";
import type { DocumentIdParamsType, DocumentDownloadQueryType } from "./documents.schemas.js";


export async function documentsRoutes(app: FastifyInstance) {

  /**
   * Gets the current base resume metadata for the current user.
   * Requires JWT.
   */
  app.get("/base-resume", { preHandler: [requireAuth] }, async (req) => {
    const userId = req.user!.id;
    const doc = await DocumentsService.getBaseResume(userId);
    return { document: doc };
  });

  /**
   * Create/replace base resume metadata for the current user.
   * Requires JWT.
   */
  app.post(
    "/base-resume",
    { preHandler: [requireAuth], schema: { body: UpsertBaseResumeBody } },
    async (req, reply) => {
      const userId = req.user!.id;
      const body = req.body as UpsertBaseResumeBodyType;

      const doc = await DocumentsService.upsertBaseResume(userId, body);
      return reply.status(201).send({ document: doc });
    }
  );

  /**
   * Delete base resume for the current user.
   * Requires JWT.
   */
  app.delete("/base-resume", { preHandler: [requireAuth] }, async (req) => {
    const userId = req.user!.id;
    return DocumentsService.deleteBaseResume(userId);
  });

    /**
   * Documents v1:
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
     * Documents v1:
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
  
}


