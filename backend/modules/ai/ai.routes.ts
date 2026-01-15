import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { JdBody, ApplicationDraftResponse } from "./ai.schemas.js";
import type { JdBodyType } from "./ai.schemas.js";
import * as AiService from "./ai.service.js";

export async function aiRoutes(app: FastifyInstance) {
  
  /**
   * Extract job information from a job description.
   */
  app.post(
    "/application-from-jd",
    {
      preHandler: [requireAuth],
      schema: {
        body: JdBody,
        response: { 200: ApplicationDraftResponse },  // expected response
      },
    },
    async (req, reply) => {  // async handler
      const body = req.body as JdBodyType;
      const result = await AiService.buildApplicationDraftFromJd(body.text);
      return reply.status(200).send({ applicationDraft: result });
    }
  );
}
