import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAiAccess } from "../../middleware/require-ai-access.js";
import { JdBody, JobLinkBody, ApplicationDraftResponse } from "./ai.schemas.js";
import type { JdBodyType, JobLinkBodyType } from "./ai.schemas.js";
import * as AiService from "./ai.service.js";
import * as DocumentToolsService from "./document-tools.service.js";
import * as DocumentsService from "../documents/documents.service.js";
import * as UserAiArtifactsService from "./user-ai-artifacts.service.js";
import { extractTextFromBuffer } from "../../lib/text-extraction.js";
import { consumeAiFreeUseOnSuccessOrThrow } from "./ai-access.js";
import { AppError } from "../../errors/app-error.js";
import { AI_MODELS } from "./openai.js";

export async function aiRoutes(app: FastifyInstance) {

  /**
   * POST /ai/application-from-jd
   * Extract job information from pasted job description text.
   */
  app.post(
    "/application-from-jd",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess],
      schema: {
        body:     JdBody,
        response: { 200: ApplicationDraftResponse },
      },
    },
    async (req, reply) => {
      try {
        const body = req.body as JdBodyType;

        const result = await AiService.buildApplicationDraftFromJd(body.text);

        // Only consume quota on successful AI completion
        await consumeAiFreeUseOnSuccessOrThrow(req.user!.id);

        return reply.status(200).send(result);

      } catch (err) {
        req.log?.error({ err }, "AI application-from-jd failed");
        if (err instanceof AppError) throw err;
        throw new AppError("AI request failed", 502, "AI_EXTRACTION_FAILED");
      }
    }
  );

  /**
   * POST /ai/application-from-link
   * Fetch a job-posting URL and extract job information from it.
   *
   * Same auth + quota rules as application-from-jd:
   * - requires auth, verified email, AI access
   * - quota is consumed only on successful AI extraction
   * - fetch/validation failures do NOT consume quota
   */
  app.post(
    "/application-from-link",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess],
      schema: {
        body:     JobLinkBody,
        response: { 200: ApplicationDraftResponse },
      },
    },
    async (req, reply) => {
      try {
        const body = req.body as JobLinkBodyType;

        const result = await AiService.buildApplicationDraftFromJobLink(body.url);

        // Only consume quota on successful AI extraction
        await consumeAiFreeUseOnSuccessOrThrow(req.user!.id);

        return reply.status(200).send(result);

      } catch (err) {
        req.log?.error({ err }, "AI application-from-link failed");

        // Preserve AppErrors (SSRF blocks, fetch failures, insufficient content, etc.)
        // These carry user-facing messages and the correct status codes.
        if (err instanceof AppError) throw err;

        throw new AppError("AI request failed", 502, "AI_EXTRACTION_FAILED");
      }
    }
  );

  /**
   * POST /ai/resume-help
   * Generic resume advice. Accepts multipart/form-data.
   *
   * Fields:
   *   resumeFile        — PDF or TXT upload (optional; falls back to base resume)
   *   targetField       — e.g. "Software Engineering"
   *   targetRolesText   — e.g. "Backend Engineer, Full Stack Developer"
   *   targetKeywords    — e.g. "TypeScript, PostgreSQL"
   *   additionalContext — free-form extra context
   *
   * Result stored as UserAiArtifact (capped at 3 per user).
   * If a file was uploaded it is stored as a user-scoped Document so the
   * user can see which resume version the advice was based on.
   */
  app.post(
    "/resume-help",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess] },
    async (req, reply) => {
      try {
        const userId = req.user!.id;

        // Parse multipart fields + optional file
        let fileBuffer:   Buffer | null = null;
        let fileMimeType: string | null = null;
        let fileFilename: string | null = null;
        const fields: Record<string, string> = {};

        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file" && part.fieldname === "resumeFile") {
            fileBuffer   = await DocumentsService.streamToBuffer(part.file);
            fileMimeType = part.mimetype;
            fileFilename = part.filename || "resume";
          } else if (part.type === "field") {
            fields[part.fieldname] = part.value as string;
          }
        }

        const { targetField, targetRolesText, targetKeywords, additionalContext } = fields;

        if (!targetField && !targetRolesText && !additionalContext) {
          throw new AppError(
            "Provide at least one targeting field: targetField, targetRolesText, or additionalContext.",
            400,
            "RESUME_HELP_MISSING_TARGET"
          );
        }

        // Resolve resume: upload to GCS if provided, otherwise use base resume
        let candidateText: string;
        let resumeSource: "BASE_RESUME" | "UPLOAD";
        let sourceDocumentId: number | null = null;

        if (fileBuffer && fileMimeType && fileFilename) {
          // Extract text from uploaded file first to validate it
          candidateText = await extractTextFromBuffer({
            buffer:   fileBuffer,
            mimeType: fileMimeType,
            maxChars: 60_000,
          });

          if (!candidateText.trim()) {
            throw new AppError(
              "Could not extract text from the uploaded file. Try a text-based PDF or TXT.",
              400,
              "RESUME_UNREADABLE"
            );
          }

          // Upload to GCS and create a user-scoped Document record
          const { Readable } = await import("node:stream");
          const doc = await DocumentsService.uploadUserToolResume({
            userId,
            stream:      Readable.from(fileBuffer),
            filename:    fileFilename,
            mimeType:    fileMimeType,
            isTruncated: false,
          });

          resumeSource     = "UPLOAD";
          sourceDocumentId = doc.id;
        } else {
          candidateText    = await DocumentsService.getBaseResumeTextOrThrow(userId);
          resumeSource     = "BASE_RESUME";
        }

        // Run AI
        const payload = await DocumentToolsService.buildGenericResumeAdvice({
          candidateText,
          targetField,
          targetRolesText,
          targetKeywords,
          additionalContext,
        });

        // Consume quota before persisting — if this throws, nothing is saved
        await consumeAiFreeUseOnSuccessOrThrow(userId);

        // Store result as UserAiArtifact (auto-caps at 3, deletes oldest)
        const artifact = await UserAiArtifactsService.createUserAiArtifact({
          userId,
          kind:    "RESUME_ADVICE",
          payload,
          model:   AI_MODELS.RESUME_ADVICE,
          resumeSource,
          sourceDocumentId,
        });

        return reply.status(201).send(artifact);

      } catch (err) {
        req.log?.error({ err }, "AI resume-help failed");
        if (err instanceof AppError) throw err;
        throw new AppError("Resume advice request failed.", 502, "AI_EXTRACTION_FAILED");
      }
    }
  );

  /**
   * POST /ai/cover-letter-help
   * Generic cover letter generation. Accepts multipart/form-data.
   *
   * Fields:
   *   resumeFile        — PDF or TXT upload (optional; falls back to base resume)
   *   targetField, targetRolesText, targetCompany, whyInterested,
   *   templateText, additionalContext
   *
   * Result stored as UserAiArtifact (capped at 3 per user).
   */
  app.post(
    "/cover-letter-help",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess] },
    async (req, reply) => {
      try {
        const userId = req.user!.id;

        let fileBuffer:   Buffer | null = null;
        let fileMimeType: string | null = null;
        let fileFilename: string | null = null;
        const fields: Record<string, string> = {};

        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file" && part.fieldname === "resumeFile") {
            fileBuffer   = await DocumentsService.streamToBuffer(part.file);
            fileMimeType = part.mimetype;
            fileFilename = part.filename || "resume";
          } else if (part.type === "field") {
            fields[part.fieldname] = part.value as string;
          }
        }

        const {
          targetField, targetRolesText, targetCompany,
          whyInterested, templateText, additionalContext,
          skipBaseCoverLetterTemplate,
        } = fields;

        if (!targetField && !targetRolesText && !targetCompany && !additionalContext) {
          throw new AppError(
            "Provide at least one targeting field: targetField, targetRolesText, targetCompany, or additionalContext.",
            400,
            "COVER_LETTER_HELP_MISSING_TARGET"
          );
        }

        let candidateText: string;
        let resumeSource: "BASE_RESUME" | "UPLOAD";
        let sourceDocumentId: number | null = null;

        if (fileBuffer && fileMimeType && fileFilename) {
          candidateText = await extractTextFromBuffer({
            buffer:   fileBuffer,
            mimeType: fileMimeType,
            maxChars: 60_000,
          });

          if (!candidateText.trim()) {
            throw new AppError(
              "Could not extract text from the uploaded file. Try a text-based PDF or TXT.",
              400,
              "RESUME_UNREADABLE"
            );
          }

          const { Readable } = await import("node:stream");
          const doc = await DocumentsService.uploadUserToolResume({
            userId,
            stream:      Readable.from(fileBuffer),
            filename:    fileFilename,
            mimeType:    fileMimeType,
            isTruncated: false,
          });

          resumeSource     = "UPLOAD";
          sourceDocumentId = doc.id;
        } else {
          candidateText    = await DocumentsService.getBaseResumeTextOrThrow(userId);
          resumeSource     = "BASE_RESUME";
        }

        // Use the per-run template if provided; fall back to the user's stored
        // base cover letter template unless they explicitly opted out.
        const effectiveTemplate =
          templateText?.trim() ||
          (skipBaseCoverLetterTemplate === "true"
            ? undefined
            : (await DocumentsService.getBaseCoverLetterTextOrNull(userId)) || undefined);

        const payload = await DocumentToolsService.buildGenericCoverLetter({
          candidateText,
          targetField,
          targetRolesText,
          targetCompany,
          whyInterested,
          templateText: effectiveTemplate,
          additionalContext,
        });

        await consumeAiFreeUseOnSuccessOrThrow(userId);

        const artifact = await UserAiArtifactsService.createUserAiArtifact({
          userId,
          kind:    "COVER_LETTER",
          payload,
          model:   AI_MODELS.COVER_LETTER,
          resumeSource,
          sourceDocumentId,
        });

        return reply.status(201).send(artifact);

      } catch (err) {
        req.log?.error({ err }, "AI cover-letter-help failed");
        if (err instanceof AppError) throw err;
        throw new AppError("Cover letter request failed.", 502, "AI_EXTRACTION_FAILED");
      }
    }
  );
}