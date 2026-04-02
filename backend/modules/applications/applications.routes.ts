import type { FastifyInstance, } from "fastify";
import { getJdExtractOpenAIModel } from "../ai/openai.js";
import { CreateApplicationBody, ListApplicationsQuery, ApplicationIdParams, UpdateApplicationBody, UploadApplicationDocumentQuery, ApplicationConnectionParams, GenerateAiArtifactBody, ListAiArtifactsQuery } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, ApplicationIdParamsType, UpdateApplicationBodyType, UploadApplicationDocumentQueryType, GenerateAiArtifactBodyType, ListAiArtifactsQueryType } from "./applications.schemas.js";
import * as ApplicationsService from "./applications.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAiAccess } from "../../middleware/require-ai-access.js";
import { AppError } from "../../errors/app-error.js";
import * as DocumentsService from "../documents/documents.service.js";
import * as AiService from "../ai/ai.service.js";
import * as DocumentToolsService from "../ai/document-tools.service.js";
import { AI_MODELS } from "../ai/openai.js";
import { DocumentKind } from "@prisma/client";
import { resolveAiTierForUser } from "../ai/ai-tier.js";
import { createAbortControllerFromRawRequest, isAbortError, throwIfAborted } from "../../lib/request-abort.js";
import { parseApplicationFilters } from "./applications.filters.js";
import { ExportApplicationsQuery, type ExportApplicationsQueryType } from "./applications.schemas.js";

export async function applicationsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new job application for the current user.
   * 
   * Validates request body shape using TypeBox schema (CreateApplicationBody).
   */
  app.post(
    "/",
    { 
      preHandler: [requireAuth, requireVerifiedEmail],
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
   *  - text search (q) across company, position, location, and tags
   *  - multi-select status, job type, and work mode (CSV params: statuses, jobTypes, workModes)
   *  - favorites only (isFavorite)
   *  - fit score range (fitMin, fitMax)
   *  - date applied range (dateAppliedFrom, dateAppliedTo)
   *  - last updated range (updatedFrom, updatedTo)
   */
  app.get(
    "/",
    { 
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { querystring: ListApplicationsQuery } 
    },
    async (req, reply) => {

      const userId = req.user!.id;

      const query = req.query as ListApplicationsQueryType;

      // Normalize querystring boolean safely ("true"/"false" -> boolean)
      const isFavorite = query.isFavorite === "true" ? true
        : query.isFavorite === "false" ? false
        : undefined;

      // Parse and validate advanced filters (multi-select enums + date ranges)
      // This also validates fit range for consistency.
      const filters = parseApplicationFilters({
        status:   query.status,
        jobType:  query.jobType,
        workMode: query.workMode,
        statuses:  query.statuses,
        jobTypes:  query.jobTypes,
        workModes: query.workModes,
        dateAppliedFrom: query.dateAppliedFrom,
        dateAppliedTo:   query.dateAppliedTo,
        updatedFrom:     query.updatedFrom,
        updatedTo:       query.updatedTo,
        fitMin: query.fitMin,
        fitMax: query.fitMax,
      });

      const result = await ApplicationsService.listApplications({
        userId,
        page:     query.page,
        pageSize: query.pageSize,
        q:        query.q,
        sortBy:   query.sortBy,
        sortDir:  query.sortDir,
        isFavorite,
        fitMin:   query.fitMin,
        fitMax:   query.fitMax,
        ...filters,
      });

      return reply.send(result);
      
    }
  );

  /**
   * Export job applications as CSV.
   *
   * Exports ALL rows matching the current filters and sort order —
   * not limited to the current page. Accepts the same filter/sort
   * params as the list endpoint plus an optional columns CSV param.
   */
  app.get(
    "/export.csv",
    {
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { querystring: ExportApplicationsQuery },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const query  = req.query as ExportApplicationsQueryType;

      const isFavorite =
        query.isFavorite === "true"  ? true  :
        query.isFavorite === "false" ? false :
        undefined;

      // Parse and validate filters (reuses the same helper as the list route)
      const filters = parseApplicationFilters({
        status:   query.status,
        jobType:  query.jobType,
        workMode: query.workMode,
        statuses:  query.statuses,
        jobTypes:  query.jobTypes,
        workModes: query.workModes,
        dateAppliedFrom: query.dateAppliedFrom,
        dateAppliedTo:   query.dateAppliedTo,
        updatedFrom:     query.updatedFrom,
        updatedTo:       query.updatedTo,
        fitMin: query.fitMin,
        fitMax: query.fitMax,
      });

      const { csv, filename } = await ApplicationsService.exportApplicationsCsv({
        userId,
        q:       query.q,
        sortBy:  query.sortBy,
        sortDir: query.sortDir,
        isFavorite,
        columns: query.columns
          ? query.columns.split(",").map((c) => c.trim()).filter(Boolean) as any
          : undefined,
        ...filters,
      });

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
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
      preHandler: [requireAuth, requireVerifiedEmail],
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
      preHandler: [requireAuth, requireVerifiedEmail], 
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
      preHandler: [requireAuth, requireVerifiedEmail], 
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
      preHandler: [requireAuth, requireVerifiedEmail],
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
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { params: ApplicationIdParams, querystring: UploadApplicationDocumentQuery },
    },
    async (req, reply) => {

      const controller = createAbortControllerFromRawRequest(req.raw, reply.raw);
      const { signal } = controller;

      try {
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
          isTruncated: (data as any).truncated === true,
          signal,
        });

        return reply.status(201).send({ document: created });
      } catch (err) {
        if (signal.aborted || isAbortError(err)) return;
        throw err;
      }
    }
  );
  

  //----------------- CONNECTIONS -----------------

  /**
   * List connections attached to an application
   */
  app.get(
    "/:id/connections",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { params: ApplicationIdParams } },
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
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { params: ApplicationConnectionParams } },
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
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { params: ApplicationConnectionParams } },
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
      preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess],
      schema: {
        params: ApplicationIdParams,
        body: GenerateAiArtifactBody,
      },
    },
    async (req, reply) => {
      const controller = createAbortControllerFromRawRequest(req.raw, reply.raw);
      const { signal } = controller;
    
      try {
        const userId = req.user!.id;
        const { id } = req.params as ApplicationIdParamsType;
        const { kind, sourceDocumentId = undefined } = req.body as GenerateAiArtifactBodyType;
    
        const application = await ApplicationsService.getApplicationById(userId, id);
    
        // JD_EXTRACT_V1: Extract the job description from the application.
        if (kind === "JD_EXTRACT_V1") {
          if (!application.description || application.description.trim().length === 0) {
            throw new AppError("Application is missing a job description.", 400);
          }
    
          const payload = await AiService.buildApplicationDraftFromJd(application.description, { signal });
    
          // If the client cancelled while OpenAI was running, do NOT persist/consume quota.
          throwIfAborted(signal);
    
          const artifact = await ApplicationsService.createAiArtifact({
            userId,
            jobApplicationId: id,
            kind,
            payload,
            model: getJdExtractOpenAIModel(),
          });
    
          return reply.status(201).send(artifact);
        }
    
        // FIT_V1: Generate a fit of compatibility between the candidate and the job description.
        if (kind === "FIT_V1") {
          if (!application.description || application.description.trim().length === 0) {
            throw new AppError("Application is missing a job description.", 400);
          }
    
          const candidate = await DocumentsService.getCandidateTextOrThrow({
            userId,
            jobApplicationId: id,
            sourceDocumentId,
          });
    
          const tier = await resolveAiTierForUser(userId);
    
          const { payload, model } = await AiService.buildFitV1(
            application.description,
            candidate.text,
            { tier, signal }
          );
    
          // If the client cancelled, don't write artifact or consume quota.
          throwIfAborted(signal);
    
          const artifact = await ApplicationsService.createAiArtifact({
            userId,
            jobApplicationId: id,
            kind,
            payload,
            model,
            sourceDocumentId: candidate.documentIdUsed,
          });
    
          return reply.status(201).send(artifact);
        }
    
        // RESUME_ADVICE: Generate resume advice for the candidate based on the job description and the candidate's resume.
        if (kind === "RESUME_ADVICE") {
          if (!application.description || application.description.trim().length === 0) {
            throw new AppError("Application is missing a job description.", 400, "JOB_DESCRIPTION_MISSING");
          }

          const candidate = await DocumentsService.getCandidateTextOrThrow({
            userId,
            jobApplicationId: id,
            sourceDocumentId,
          });

          const payload = await DocumentToolsService.buildTargetedResumeAdvice({
            candidateText: candidate.text,
            jdText:        application.description,
            signal,
          });

          throwIfAborted(signal);

          const artifact = await ApplicationsService.createAiArtifact({
            userId,
            jobApplicationId: id,
            kind,
            payload,
            model:            AI_MODELS.RESUME_ADVICE,
            sourceDocumentId: candidate.documentIdUsed,
          });

          return reply.status(201).send(artifact);
        }

        // COVER_LETTER: Generate a cover letter for the candidate based on the job description and the candidate's resume.
        if (kind === "COVER_LETTER") {
          if (!application.description || application.description.trim().length === 0) {
            throw new AppError("Application is missing a job description.", 400, "JOB_DESCRIPTION_MISSING");
          }

          const candidate = await DocumentsService.getCandidateTextOrThrow({
            userId,
            jobApplicationId: id,
            sourceDocumentId,
          });

          const { templateText } = req.body as GenerateAiArtifactBodyType;

          // Use the per-run template if provided; otherwise fall back to the
          // user's stored base cover letter template (if one exists).
          const effectiveTemplate =
            templateText?.trim() ||
            (await DocumentsService.getBaseCoverLetterTextOrNull(userId)) ||
            undefined;

          const payload = await DocumentToolsService.buildTargetedCoverLetter({
            candidateText: candidate.text,
            jdText:        application.description,
            templateText:  effectiveTemplate,
            signal,
          });

          throwIfAborted(signal);

          const artifact = await ApplicationsService.createAiArtifact({
            userId,
            jobApplicationId: id,
            kind,
            payload,
            model:            AI_MODELS.COVER_LETTER,
            sourceDocumentId: candidate.documentIdUsed,
          });

          return reply.status(201).send(artifact);
        }

        throw new AppError(`Unsupported AI artifact kind: ${kind}`, 400);
    
      } catch (err) {
        // Cancellation is expected: don't log as failure, don't try to reply.
        if (signal.aborted || isAbortError(err)) return;
    
        throw err;
      }
    }    
  );

  /**
   * List AI artifacts for an application.
   */
  app.get(
    "/:id/ai-artifacts",
    {
      preHandler: [requireAuth, requireVerifiedEmail],
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