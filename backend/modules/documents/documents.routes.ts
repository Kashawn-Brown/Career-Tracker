import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { UpsertBaseResumeBody } from "./documents.schemas.js";
import type { UpsertBaseResumeBodyType } from "./documents.schemas.js";
import * as DocumentsService from "./documents.service.js";

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
}
