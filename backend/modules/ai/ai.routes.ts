import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAiAccess } from "../../middleware/require-ai-access.js";
import { JdBody, ApplicationDraftResponse } from "./ai.schemas.js";
import type { JdBodyType } from "./ai.schemas.js";
import * as AiService from "./ai.service.js";
import { consumeAiFreeUseOnSuccessOrThrow } from "./ai-access.js";
import { AppError } from "../../errors/app-error.js";

export async function aiRoutes(app: FastifyInstance) {
  
  /**
   * Extract job information from a job description.
   */
  app.post(
    "/application-from-jd",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAiAccess],
      schema: {
        body: JdBody,
        response: { 200: ApplicationDraftResponse },  // expected response
      },
    },
    async (req, reply) => {  // async handler
      try {
        const body = req.body as JdBodyType;

        const result = await AiService.buildApplicationDraftFromJd(body.text);
        
        // Only consume quota on successful AI completion
        await consumeAiFreeUseOnSuccessOrThrow(req.user!.id);

        return reply.status(200).send(result);

      } catch (err) {
        
        // Want the real OpenAI error in logs for debugging
        req.log?.error({ err }, "AI application-from-jd failed");
    
        // If already an AppError (ex: missing env var), preserve it
        if (err instanceof AppError) throw err;
    
        // Otherwise, return a clean dependency failure
        throw new AppError("AI request failed", 502, "AI_EXTRACTION_FAILED");
      }
    }
  );
}
