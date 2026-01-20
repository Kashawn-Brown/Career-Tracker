import type { FastifyInstance, } from "fastify";
import { getOpenAIModel } from "../ai/openai.js";
import { CreateApplicationBody, ListApplicationsQuery, ApplicationIdParams, UpdateApplicationBody, UploadApplicationDocumentQuery, ApplicationConnectionParams, GenerateAiArtifactBody, ListAiArtifactsQuery } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, ApplicationIdParamsType, UpdateApplicationBodyType, UploadApplicationDocumentQueryType, GenerateAiArtifactBodyType, ListAiArtifactsQueryType } from "./applications.schemas.js";
import * as ApplicationsService from "./applications.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../errors/app-error.js";
import * as DocumentsService from "../documents/documents.service.js";
import * as AiService from "../ai/ai.service.js";
import { DocumentKind } from "@prisma/client";


export async function applicationsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new job application for the current user.
   * 
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
   * 
   * Supports filters: 
   *  - text query (q) on company/position
   *  - status filter
   *  - job type filter
   *  - work mode filter
   *  - is favorite.
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
   * 
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
   * 
   * Updates the current user's application
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
   * 
   * Deletes the current user's application
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


  
  //----------------- DOCUMENTS -----------------

  /**
   * Lists documents for an application.
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

      // Get the documents for the application
      const documents = await DocumentsService.listApplicationDocuments(userId, applicationId);

      return { documents };
    }
  );
  
  /**
   * Upload a document to an application
   * 
   * multipart/form-data with a single file field.
   * Optional kind via querystring: ?kind=RESUME|COVER_LETTER|CAREER_HISTORY|OTHER
   * 
   * CAREER_HISTORY is Phase E AI-only (not exposed in normal user upload UI).
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

      const data = await req.file();
      if (!data) {
        throw new AppError("No file uploaded.", 400);
      }

      const kind = (query.kind ?? "OTHER") as DocumentKind;

      const created = await DocumentsService.uploadApplicationDocument({
        userId,
        jobApplicationId: applicationId, 
        kind,
        stream: data.file,
        filename: data.filename,
        mimeType: data.mimetype,
        isTruncated: (data.file as any).truncated === true,
      });

      return reply.status(201).send({ document: created });
    }
  );
  

  //----------------- CONNECTIONS -----------------

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


  //----------------- AI ARTIFACTS -----------------
  
  /**
   * Generate an AI artifact for an application.
   */
  app.post(
    "/:id/ai-artifacts",
    {
      preHandler: [requireAuth],
      schema: {
        params: ApplicationIdParams,
        body: GenerateAiArtifactBody,
      },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const { id } = req.params as ApplicationIdParamsType;
      const { kind, sourceDocumentId = undefined } = req.body as GenerateAiArtifactBodyType;

      // Ensure app exists and belongs to user (also gives us description)
      const application = await ApplicationsService.getApplicationById(userId, id);

      // Check if the kind is supported.
      if (kind === "JD_EXTRACT_V1") {
        
        // Check if the application has a job description.
        if (!application.description || application.description.trim().length === 0) {
          throw new AppError("Application is missing a job description.", 400);
        }

        // Generate the AI artifact.
        const payload = await AiService.buildApplicationDraftFromJd(application.description);

        // Create the AI artifact.
        const artifact = await ApplicationsService.createAiArtifact({
          userId,
          jobApplicationId: id,
          kind,
          payload,
          model: getOpenAIModel(),
        });

        // Return the AI artifact.
        return reply.status(201).send(artifact);
      }

      throw new AppError(`Unsupported AI artifact kind: ${kind}`, 400);
    }
  );

  /**
   * List AI artifacts for an application.
   */
  app.get(
    "/:id/ai-artifacts",
    {
      preHandler: [requireAuth],
      schema: {
        params: ApplicationIdParams,
        querystring: ListAiArtifactsQuery,
      },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const { id } = req.params as ApplicationIdParamsType;
      const query = (req.query ?? {}) as ListAiArtifactsQueryType;

      const artifacts = await ApplicationsService.listAiArtifacts({
        userId,
        jobApplicationId: id,
        kind: query.kind,
        all: query.all,
      });

      return reply.status(200).send(artifacts);
    }
  );

}
