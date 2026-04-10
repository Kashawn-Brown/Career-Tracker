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
import * as DocumentToolsService  from "../ai/document-tools.service.js";
import * as InterviewPrepService  from "../ai/interview-prep.service.js";
import { AI_MODELS } from "../ai/openai.js";
import { DocumentKind } from "@prisma/client";
import { resolveAiTierForUser } from "../ai/ai-tier.js";
import { createAbortControllerFromRawRequest, isAbortError, throwIfAborted } from "../../lib/request-abort.js";
import { parseApplicationFilters } from "./applications.filters.js";
import { ExportApplicationsQuery, type ExportApplicationsQueryType } from "./applications.schemas.js";
import { trackEventForUser } from "../analytics/analytics-tracker.js";
import { startAiRun, succeedAiRun, failAiRun } from "../analytics/ai-run-tracker.js";
import { consumeCreditsOnSuccess, getExecutionProfile } from "../plans/entitlement-policy.js";

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

      // Track application creation — note whether it came from JD extraction or manual entry
      void trackEventForUser(userId, {
        applicationId: created.id,
        eventType:     "APPLICATION_CREATED",
        category:      "APPLICATION",
        surface:       "CREATE_FORM",
        metadata: {
          creationMethod: body.description && body.jdSummary ? "JD_EXTRACTION" : "MANUAL",
        },
      });

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

      void trackEventForUser(userId, {
        eventType: "APPLICATIONS_CSV_EXPORTED",
        category:  "EXPORT",
        metadata:  { resultCount: csv.split("\n").length - 1 },
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

      void trackEventForUser(userId, {
        applicationId: params.id,
        eventType:     "APPLICATION_UPDATED",
        category:      "APPLICATION",
      });

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
    async (req, reply) => {
      const userId = req.user!.id;
      const params = req.params as ApplicationIdParamsType;

      await ApplicationsService.deleteApplication(userId, params.id);

      // Note: applicationId is intentionally omitted — the row is already
      // deleted by this point so passing it would cause a FK violation.
      void trackEventForUser(userId, {
        eventType: "APPLICATION_DELETED",
        category:  "APPLICATION",
      });

      return reply.status(204).send();
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

      // Declared outside try so the catch block can call failAiRun on error
      let runId: string | null = null;
    
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

          runId = await startAiRun({
            userId,
            applicationId:  id,
            toolKind:       "FIT",
            scope:          "TARGETED",
            triggerSource:  "APPLICATION_DRAWER",
            provider:       "openai",
            model:          AI_MODELS.FIT_REGULAR, // resolved post-run; updated on succeed
            resumeMode:     candidate.source === "BASE" ? "BASE" : "ATTACHED",
            jdMode:         "APPLICATION_DESCRIPTION",
          });

          const { payload, model, usage: fitUsage } = await AiService.buildFitV1(
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

          void succeedAiRun({
            runId,
            applicationArtifactId: artifact.id,
            inputChars:       candidate.text.length + application.description.length,
            promptTokens:     fitUsage.input,
            completionTokens: fitUsage.output,
            totalTokens:      fitUsage.total,
          });
          void consumeCreditsOnSuccess(userId, "FIT");
    
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

          runId = await startAiRun({
            userId,
            applicationId: id,
            toolKind:      "RESUME_ADVICE",
            scope:         "TARGETED",
            triggerSource: "APPLICATION_DRAWER",
            provider:      "openai",
            model:         AI_MODELS.RESUME_ADVICE,
            resumeMode:    candidate.source === "BASE" ? "BASE" : "ATTACHED",
            jdMode:        "APPLICATION_DESCRIPTION",
          });

          const raProfile = getExecutionProfile(await resolveAiTierForUser(userId));
          const { payload, usage: raUsage } = await DocumentToolsService.buildTargetedResumeAdvice({
            candidateText: candidate.text,
            jdText:        application.description,
            signal,
            profile:       raProfile,
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

          void succeedAiRun({
            runId,
            applicationArtifactId: artifact.id,
            inputChars:       candidate.text.length + application.description.length,
            promptTokens:     raUsage.input,
            completionTokens: raUsage.output,
            totalTokens:      raUsage.total,
          });
          void consumeCreditsOnSuccess(userId, "RESUME_ADVICE");

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

          const { templateText, skipBaseCoverLetterTemplate } = req.body as GenerateAiArtifactBodyType;

          // Priority: per-run upload > explicit skip > stored base template
          const effectiveTemplate =
            templateText?.trim() ||
            (skipBaseCoverLetterTemplate
              ? undefined
              : (await DocumentsService.getBaseCoverLetterTextOrNull(userId)) || undefined);

          runId = await startAiRun({
            userId,
            applicationId: id,
            toolKind:      "COVER_LETTER",
            scope:         "TARGETED",
            triggerSource: "APPLICATION_DRAWER",
            provider:      "openai",
            model:         AI_MODELS.COVER_LETTER,
            resumeMode:    candidate.source === "BASE" ? "BASE" : "ATTACHED",
            jdMode:        "APPLICATION_DESCRIPTION",
          });

          const clProfile = getExecutionProfile(await resolveAiTierForUser(userId));
          const { payload, usage: clUsage } = await DocumentToolsService.buildTargetedCoverLetter({
            candidateText: candidate.text,
            jdText:        application.description,
            templateText:  effectiveTemplate,
            signal,
            profile:       clProfile,
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

          void succeedAiRun({
            runId,
            applicationArtifactId: artifact.id,
            inputChars:       candidate.text.length + application.description.length,
            promptTokens:     clUsage.input,
            completionTokens: clUsage.output,
            totalTokens:      clUsage.total,
          });
          void consumeCreditsOnSuccess(userId, "COVER_LETTER");

          return reply.status(201).send(artifact);
        }

        // INTERVIEW_PREP: Generate interview prep for the candidate based on the JD.
        // Resume is optional — runs JD-only if no resume is available, produces
        // richer output when a resume source is found.
        if (kind === "INTERVIEW_PREP") {
          if (!application.description || application.description.trim().length === 0) {
            throw new AppError("Application is missing a job description.", 400, "JOB_DESCRIPTION_MISSING");
          }

          // Soft resolve: explicit sourceDocumentId throws if invalid;
          // base resume used if available; null if no resume at all.
          const candidate = await DocumentsService.tryGetCandidateText({
            userId,
            jobApplicationId: id,
            sourceDocumentId,
          });

          runId = await startAiRun({
            userId,
            applicationId: id,
            toolKind:      "INTERVIEW_PREP",
            scope:         "TARGETED",
            triggerSource: "APPLICATION_DRAWER",
            provider:      "openai",
            model:         AI_MODELS.INTERVIEW_PREP,
            resumeMode:    candidate ? (candidate.source === "BASE" ? "BASE" : "ATTACHED") : "NONE",
            jdMode:        "APPLICATION_DESCRIPTION",
          });

          const ipProfile = getExecutionProfile(await resolveAiTierForUser(userId));
          const { payload, usage: ipUsage } = await InterviewPrepService.buildTargetedInterviewPrep({
            jdText:        application.description,
            candidateText: candidate?.text ?? null,
            signal,
            profile:       ipProfile,
          });

          throwIfAborted(signal);

          const artifact = await ApplicationsService.createAiArtifact({
            userId,
            jobApplicationId: id,
            kind,
            payload,
            model:            AI_MODELS.INTERVIEW_PREP,
            sourceDocumentId: candidate?.documentIdUsed ?? undefined,
          });

          void succeedAiRun({
            runId,
            applicationArtifactId: artifact.id,
            inputChars:       (candidate?.text.length ?? 0) + application.description.length,
            promptTokens:     ipUsage.input,
            completionTokens: ipUsage.output,
            totalTokens:      ipUsage.total,
          });
          void consumeCreditsOnSuccess(userId, "INTERVIEW_PREP");

          return reply.status(201).send(artifact);
        }

        throw new AppError(`Unsupported AI artifact kind: ${kind}`, 400);
    
      } catch (err) {
        // Cancellation is expected: don't log as failure, don't try to reply.
        if (signal.aborted || isAbortError(err)) return;

        void failAiRun({ runId, error: err });
    
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