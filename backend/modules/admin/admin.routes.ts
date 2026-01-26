import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { ProDecisionBody } from "./admin.schemas.js";
import type { ProDecisionBodyType } from "./admin.schemas.js";
import * as AdminService from "./admin.service.js";

export async function adminRoutes(app: FastifyInstance) {
  /**
   * Admin list all Pro requests (pending/denied/approved/expired)
   */
  app.get(
    "/pro-requests",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAdmin] },
    async () => {
      return AdminService.listProRequestsForAdmin();
    }
  );

  /**
   * Admin approve a users Pro access request by requestId
   */
  app.post(
    "/pro-requests/:requestId/approve",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { body: ProDecisionBody },
    },
    async (req) => {
      const { requestId } = req.params as { requestId: string };
      const body = req.body as ProDecisionBodyType;

      await AdminService.approveProRequest(requestId, body.decisionNote);
      return { ok: true };
    }
  );

  /**
   * Admin deny a users Pro access request by requestId
   */
  app.post(
    "/pro-requests/:requestId/deny",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { body: ProDecisionBody },
    },
    async (req) => {
      const { requestId } = req.params as { requestId: string };
      const body = req.body as ProDecisionBodyType;

      const res = await AdminService.denyProRequest(requestId, body.decisionNote);
      return res;
    }
  );

  /**
   * Admin grant more free AI credits to a user by requestId
   */
  app.post(
    "/admin/pro-requests/:requestId/grant-credits",
    {
      preHandler: [requireAuth, requireVerifiedEmail, (req) => requireAdmin(req)],
    },
    async (req) => {
      const { requestId } = req.params as { requestId: string };
      return AdminService.grantMoreCredits(requestId);
    }
  );
  
}
