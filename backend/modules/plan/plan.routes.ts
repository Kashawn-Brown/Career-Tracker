import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { RequestCreditsBody } from "./plan.schemas.js";
import type { RequestCreditsBodyType } from "./plan.schemas.js";
import * as PlanService from "./plan.service.js";

export async function planRoutes(app: FastifyInstance) {

  /**
   * User requests more AI credits.
   *
   * Requires: authenticated + verified email.
   * Rate-limited to 3 requests per day per user.
   */
  app.post(
    "/request",
    {
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { body: RequestCreditsBody },
      config: { rateLimit: { max: 3, timeWindow: "1 day", keyGenerator: rateLimitKeyByUser } },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const body = req.body as RequestCreditsBodyType;

      const result = await PlanService.requestMoreCredits(userId, body.note);
      return reply.send({ ok: true, ...result });
    }
  );

}

// ----------------- Helper Functions -----------------

function rateLimitKeyByUser(req: FastifyRequest): string {
  return req.user?.id ?? req.ip;
}