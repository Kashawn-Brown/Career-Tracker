import type { FastifyInstance, FastifyRequest } from "fastify";
import { CreateApplicationBody, ListApplicationsQuery, ApplicationIdParams, UpdateApplicationBody, UploadApplicationDocumentQuery, ApplicationConnectionParams } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, ApplicationIdParamsType, UpdateApplicationBodyType, UploadApplicationDocumentQueryType } from "./applications.schemas.js";
import * as ApplicationsService from "./applications.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../errors/app-error.js";
import { getGcsConfig, getStorageClient } from "../../lib/gcs.js";
import * as DocumentsService from "../documents/documents.service.js";
import { DocumentKind } from "@prisma/client";
import crypto from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";


export async function applicationsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new job application for the current user.
   * Validates request body shape using TypeBox schema (CreateApplicationBody).
   */
  app.post(
    "/",
    { 
      preHandler: [requireAuth],
      schema: { body: CreateApplicationBody } 
    },
    async (req, reply) => {
      
      const userId = req.user!.id;

      // req.body is validated by Fastify against the schema,
      // and cast to a matching TS type for strong typing.
      const body = req.body as CreateApplicationBodyType;
      
      const created = await ApplicationsService.createApplication({ userId, ...body });

      return reply.status(201).send({ application: created });

    }
  );

  /**
   * List job applications for the current user.
   * Supports basic filters: status and a text query (q) on company/position.
   */
  app.get(
    "/",
    { 
      preHandler: [requireAuth],
      schema: { querystring: ListApplicationsQuery } 
    },
    async (req, reply) => {

      const userId = req.user!.id;

      const query = req.query as ListApplicationsQueryType;

      // Normalize querystring boolean safely ("true"/"false" -> boolean)
      const isFavorite = query.isFavorite === "true" ? true : query.isFavorite === "false" ? false : undefined;

      const result = await ApplicationsService.listApplications({ userId, ...query, isFavorite });

      return reply.send(result);
      
    }
  );

  /**
   * Get one application
   * Requires JWT
   * Returns a specific application record for the current user
   */
app.get(
  "/:id",
  {
    preHandler: [requireAuth],
    schema: { params: ApplicationIdParams },
  },
  async (req) => {
    const userId = req.user!.id;
    const { id } = req.params as ApplicationIdParamsType;

    const application = await ApplicationsService.getApplicationById(userId, id);
    
    return { application };
  }
);

  /**
   * Update an application
   * Requires JWT
   * Only updates the current user's application
   */
  app.patch(
    "/:id",
    { 
      preHandler: [requireAuth], 
      schema: { params: ApplicationIdParams, body: UpdateApplicationBody } 
    },
    async (req, reply) => {
      const userId = req.user!.id;
      
      const params = req.params as ApplicationIdParamsType;
      
      const body = req.body as UpdateApplicationBodyType;

      const updated = await ApplicationsService.updateApplication(userId, params.id, body);
      
      return reply.send({ application: updated });
    }
  );

  /**
   * Delete an application
   * Requires JWT
   * Only deletes the current user's application
   */
  app.delete(
    "/:id",
    { 
      preHandler: [requireAuth], 
      schema: { params: ApplicationIdParams } 
    },
    async (req) => {
      const userId = req.user!.id;
      const params = req.params as ApplicationIdParamsType;

      return ApplicationsService.deleteApplication(userId, params.id);
    }
  );


  /** DOCUMENT ROUTES */

  // HELPERS

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
  
  // Helper function to build a storage key for a document
  function buildStorageKey(userId: string, applicationId: string, originalName: string) {
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
  
  // Helper function to check if a mime type is allowed
  function mimeAllowed(allowed: unknown, mimetype: string) {
    if (Array.isArray(allowed)) return allowed.includes(mimetype);
    if (allowed instanceof Set) return allowed.has(mimetype);
    return false;
  }

    /**
   * List documents for an application
   */
    app.get(
      "/:id/documents",
      {
        preHandler: [requireAuth],
        schema: { params: ApplicationIdParams },
      },
      async (req) => {
        const userId = req.user!.id;
        const { id: applicationId } = req.params as ApplicationIdParamsType;
  
        // Ensure the application exists and belongs to the user
        await ApplicationsService.getApplicationById(userId, applicationId);
  
        const documents = await DocumentsService.listApplicationDocuments(userId, applicationId);
        return { documents };
      }
    );
  
    /**
     * Upload a document to an application (GCS)
     * multipart/form-data with a single file field.
     * Optional kind via querystring: ?kind=RESUME|COVER_LETTER|OTHER
     */
    app.post(
      "/:id/documents",
      {
        preHandler: [requireAuth],
        schema: { params: ApplicationIdParams, querystring: UploadApplicationDocumentQuery },
      },
      async (req, reply) => {
        const userId = req.user!.id;
        const { id: applicationId } = req.params as ApplicationIdParamsType;
        const query = req.query as UploadApplicationDocumentQueryType;
  
        // Ensure the application exists and belongs to the user
        await ApplicationsService.getApplicationById(userId, applicationId);
  
        // Simple guardrail to prevent endless attachments (adjust later if needed)
        const MAX_DOCS_PER_APPLICATION = 25;
        const currentCount = await DocumentsService.countApplicationDocuments(userId, applicationId);
        if (currentCount >= MAX_DOCS_PER_APPLICATION) {
          throw new AppError(`Document limit reached (${MAX_DOCS_PER_APPLICATION}).`, 400);
        }
  
        const cfg = getGcsConfig();
  
        const data = await req.file();
        if (!data) {
          throw new AppError("No file uploaded.", 400);
        }
  
        const { file, filename, mimetype } = data;
  
        // Check if the mime type is allowed
        if (!mimeAllowed(cfg.allowedMimeTypes, mimetype)) {
          throw new AppError(`Unsupported file type: ${mimetype}`, 400);
        }
  
        // Build the storage key for the document, get the bucket and file
        const storageKey = buildStorageKey(userId, applicationId, filename);
        const bucket = getStorageClient().bucket(cfg.bucketName);
        const gcsFile = bucket.file(storageKey);
  
        const { stream: counter, getBytes } = createByteCounter();
  
        // Upload the file to GCS
        try {
          await pipeline(
            file,
            counter,
            gcsFile.createWriteStream({
              resumable: false,
              metadata: { contentType: mimetype },
            })
          );
        } catch (err) {
          // Best-effort cleanup if the stream failed mid-upload
          await gcsFile.delete({ ignoreNotFound: true });
          throw err;
        }
  
        // If the parser truncated due to fileSize limit, cleanup and fail
        if ((data.file as any).truncated) {
          await gcsFile.delete({ ignoreNotFound: true });
          throw new AppError("File too large.", 413);
        }
  
        const kind = (query.kind ?? "OTHER") as DocumentKind;
  
        const created = await DocumentsService.createApplicationDocument(userId, applicationId, {
          kind,
          storageKey,
          originalName: filename,
          mimeType: mimetype,
          size: getBytes(),
        });
  
        return reply.status(201).send({ document: created });
      }
    );
  

    /** CONNECTIONS : */

    /**
   * List connections attached to an application
   */
  app.get(
    "/:id/connections",
    { preHandler: [requireAuth], schema: { params: ApplicationIdParams } },
    async (req) => {
      const userId = req.user!.id;
      const { id } = req.params as { id: string };

      const connections = await ApplicationsService.listApplicationConnections(userId, id);
      return { connections };
    }
  );

  /**
   * Attach a connection to an application
   */
  app.post(
    "/:id/connections/:connectionId",
    { preHandler: [requireAuth], schema: { params: ApplicationConnectionParams } },
    async (req) => {
      const userId = req.user!.id;
      const { id, connectionId } = req.params as { id: string; connectionId: string };

      return ApplicationsService.attachConnectionToApplication(userId, id, connectionId);
    }
  );

  /**
   * Detach a connection from an application
   */
  app.delete(
    "/:id/connections/:connectionId",
    { preHandler: [requireAuth], schema: { params: ApplicationConnectionParams } },
    async (req) => {
      const userId = req.user!.id;
      const { id, connectionId } = req.params as { id: string; connectionId: string };

      return ApplicationsService.detachConnectionFromApplication(userId, id, connectionId);
    }
  );
  

}
