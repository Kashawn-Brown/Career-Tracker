import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { RequestProBody } from "./pro.schemas.js";
import type { RequestProBodyType } from "./pro.schemas.js";
import * as ProService from "./pro.service.js";

export async function proRoutes(app: FastifyInstance) {
  
  /**
   * User requests Pro access.
   * 
   * Requires user: authenticated + verified email.
   */
  app.post(
    "/request",
    {
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { body: RequestProBody },
      config: { rateLimit: { max: 3, timeWindow: "1 day", keyGenerator: rateLimitKeyByUser } },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const body = req.body as RequestProBodyType;

      const result = await ProService.requestProAccess(userId, body.note);
      return reply.send({ ok: true, ...result });
    }
  );

}

// ----------------- Helper Functions -----------------

/**
 * Rate limit key by user ID and IP.
 */
function rateLimitKeyByUser(req: FastifyRequest): string {
  return req.user?.id ?? req.ip;
}
