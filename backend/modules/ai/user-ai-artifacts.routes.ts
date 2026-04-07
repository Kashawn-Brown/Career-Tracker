/**
 * user-ai-artifacts.routes.ts
 *
 * Routes for user-scoped AI artifacts (generic document tool results).
 *
 * GET  /user-ai-artifacts        — list artifacts, optionally filtered by ?kind=
 * DELETE /user-ai-artifacts/:id  — delete a specific artifact
 *
 * Creation happens through the AI routes (POST /ai/resume-help,
 * POST /ai/cover-letter-help), not here.
 */

import type { FastifyInstance } from "fastify";
import { requireAuth }          from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { AppError }             from "../../errors/app-error.js";
import * as UserAiArtifactsService from "./user-ai-artifacts.service.js";

export async function userAiArtifactsRoutes(app: FastifyInstance) {

  /**
   * GET /user-ai-artifacts
   * List the current user's AI artifacts, newest first.
   * Optional querystring: ?kind=RESUME_ADVICE or ?kind=COVER_LETTER
   */
  app.get(
    "/",
    { preHandler: [requireAuth, requireVerifiedEmail] },
    async (req, reply) => {
      const userId = req.user!.id;
      const kind   = (req.query as Record<string, string>).kind;

      // Validate kind if provided
      const VALID_KINDS = ["RESUME_ADVICE", "COVER_LETTER", "INTERVIEW_PREP"] as const;
      if (kind && !VALID_KINDS.includes(kind as typeof VALID_KINDS[number])) {
        throw new AppError(`Invalid kind. Must be one of: ${VALID_KINDS.join(", ")}`, 400, "INVALID_KIND");
      }

      const artifacts = await UserAiArtifactsService.listUserAiArtifacts({ userId, kind });
      return reply.status(200).send({ artifacts });
    }
  );

  /**
   * DELETE /user-ai-artifacts/:id
   * Delete a specific artifact. Only the owning user can delete it.
   */
  app.delete(
    "/:id",
    { preHandler: [requireAuth, requireVerifiedEmail] },
    async (req, reply) => {
      const userId     = req.user!.id;
      const { id }     = req.params as { id: string };

      await UserAiArtifactsService.deleteUserAiArtifact(userId, id);
      return reply.status(204).send();
    }
  );
}