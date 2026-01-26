import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAdminApiKey, rateLimitKeyByUser } from "./pro.http.js";
import { RequestProBody, AdminApproveProBody, AdminDenyProBody } from "./pro.schemas.js";
import type { RequestProBodyType, AdminApproveProBodyType, AdminDenyProBodyType } from "./pro.schemas.js";
import * as ProService from "./pro.service.js";

export async function proRoutes(app: FastifyInstance) {
  
  /**
   * User requests Pro access.
   * 
   * Requires: authenticated + verified email.
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

  /**
   * Admin: approve Pro request for a userId.
   * 
   * Requires: admin API key in headers.
   */
  app.post(
    "/admin/approve",
    { preHandler: [requireAdminApiKey], schema: { body: AdminApproveProBody } },
    async (req, reply) => {
      const body = req.body as AdminApproveProBodyType;
      await ProService.approveProAccess(body.userId, body.decisionNote);
      return reply.send({ ok: true });
    }
  );

  /**
   * Admin: deny Pro request for a userId.
   * 
   * Requires: admin API key in headers.
   */
  app.post(
    "/admin/deny",
    { preHandler: [requireAdminApiKey], schema: { body: AdminDenyProBody } },
    async (req, reply) => {
      const body = req.body as AdminDenyProBodyType;
      const res = await ProService.denyProAccess(body.userId, body.cooldownDays, body.decisionNote);
      return reply.send(res);
    }
  );
}
