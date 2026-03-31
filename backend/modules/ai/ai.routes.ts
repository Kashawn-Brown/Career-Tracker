import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAiAccess } from "../../middleware/require-ai-access.js";
import { JdBody, JobLinkBody, ApplicationDraftResponse } from "./ai.schemas.js";
import type { JdBodyType, JobLinkBodyType } from "./ai.schemas.js";
import * as AiService from "./ai.service.js";
import { consumeAiFreeUseOnSuccessOrThrow } from "./ai-access.js";
import { AppError } from "../../errors/app-error.js";

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
}