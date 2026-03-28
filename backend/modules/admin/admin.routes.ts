import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { ProDecisionBody, ListUsersQuery, AdminUserIdParams, UpdateUserPlanBody, UpdateUserStatusBody } from "./admin.schemas.js";
import type { ProDecisionBodyType, ListUsersQueryType, AdminUserIdParamsType, UpdateUserPlanBodyType, UpdateUserStatusBodyType } from "./admin.schemas.js";
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
    "/pro-requests/:requestId/grant-credits",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
    },
    async (req) => {
      const { requestId } = req.params as { requestId: string };
      return AdminService.grantMoreCredits(requestId);
    }
  );

  // /**
  //  * Admin make a user a Pro user by userId
  //  */
  // app.post(
  //   "/users/:userId/make-pro",
  //   {
  //     preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
  //   },
  //   async (req) => {
  //     const { userId } = req.params as { userId: string };
  //     return AdminService.makeUserPro(userId);
  //   }
  // );

  // /**
  //  * Admin make a user a Pro Plus user by userId
  //  */
  // app.post(
  //   "/users/:userId/make-pro-plus",
  //   {
  //     preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
  //   },
  //   async (req) => {
  //     const { userId } = req.params as { userId: string };
  //     return AdminService.makeUserProPlus(userId);
  //   }
  // );

  /**
   * List users for admin.
   * Supports optional search (q), role filter, plan filter, pagination.
   */
  app.get(
    "/users",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { querystring: ListUsersQuery },
    },
    async (req, reply) => {
      const query = req.query as ListUsersQueryType;
      const result = await AdminService.listUsersForAdmin(query);
      return reply.send(result);
    }
  );

  /**
   * Update a user's plan (admin only).
   * Admin accounts are protected from this action.
   */
  app.patch(
    "/users/:userId/plan",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { params: AdminUserIdParams, body: UpdateUserPlanBody },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      const { plan }   = req.body   as UpdateUserPlanBodyType;
      const result = await AdminService.updateUserPlan(userId, plan);
      return reply.send(result);
    }
  );
  
  /**
   * Get a single user's details (admin).
   */
  app.get(
    "/users/:userId",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { params: AdminUserIdParams },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      const result = await AdminService.getUserDetailForAdmin(userId);
      return reply.send(result);
    }
  );

  /**
   * Activate or deactivate a user (admin only).
   * Admin accounts are protected from this action.
   */
  app.patch(
    "/users/:userId/status",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema: { params: AdminUserIdParams, body: UpdateUserStatusBody },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      const { isActive } = req.body as UpdateUserStatusBodyType;
      const result = await AdminService.setUserActiveStatus(userId, isActive);
      return reply.send(result);
    }
  );


}
