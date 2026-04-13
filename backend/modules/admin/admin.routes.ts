import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import {
  ListUsersQuery,
  AdminUserIdParams,
  AdminUserRequestParams,
  UpdateUserPlanBody,
  UpdateUserStatusBody,
  AdminAddCreditsBody,
} from "./admin.schemas.js";
import type {
  ListUsersQueryType,
  AdminUserIdParamsType,
  AdminUserRequestParamsType,
  UpdateUserPlanBodyType,
  UpdateUserStatusBodyType,
  AdminAddCreditsBodyType,
} from "./admin.schemas.js";
import { adminAddCredits, adminResetCycle, resolveUsageState } from "../plan/entitlement-policy.js";
import * as AdminService from "./admin.service.js";

export async function adminRoutes(app: FastifyInstance) {

  /**
   * List users for admin.
   * Supports optional search (q), role filter, plan filter, pagination.
   */
  app.get(
    "/users",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { querystring: ListUsersQuery },
    },
    async (req, reply) => {
      const query  = req.query as ListUsersQueryType;
      const result = await AdminService.listUsersForAdmin(query);
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
      schema:     { params: AdminUserIdParams },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      const result     = await AdminService.getUserDetailForAdmin(userId);
      return reply.send(result);
    }
  );

  /**
   * Update a user's plan (admin only).
   * Admin accounts are protected from this action.
   * Auto-closes any open credit request on the user.
   */
  app.patch(
    "/users/:userId/plan",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { params: AdminUserIdParams, body: UpdateUserPlanBody },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      const { plan }   = req.body   as UpdateUserPlanBodyType;
      const adminUserId = req.user!.id;

      const result = await AdminService.updateUserPlan(userId, plan);
      await AdminService.autoCloseOpenPlanRequest(userId, adminUserId, "plan_updated");
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
      schema:     { params: AdminUserIdParams, body: UpdateUserStatusBody },
    },
    async (req, reply) => {
      const { userId }  = req.params as AdminUserIdParamsType;
      const { isActive } = req.body  as UpdateUserStatusBodyType;
      const result       = await AdminService.setUserActiveStatus(userId, isActive);
      return reply.send(result);
    }
  );

  /**
   * GET /admin/users/:userId/usage
   * Returns the current plan usage state for a user (admin view).
   */
  app.get(
    "/users/:userId/usage",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { params: AdminUserIdParams },
    },
    async (req, reply) => {
      const { userId } = req.params as AdminUserIdParamsType;
      return reply.send(await resolveUsageState(userId));
    }
  );

  /**
   * POST /admin/users/:userId/credits/add
   * Add bonus credits to a user's current cycle.
   * Auto-closes any open credit request on the user.
   */
  app.post(
    "/users/:userId/credits/add",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { params: AdminUserIdParams, body: AdminAddCreditsBody },
    },
    async (req, reply) => {
      const { userId }        = req.params as AdminUserIdParamsType;
      const { credits, note } = req.body   as AdminAddCreditsBodyType;
      const adminUserId       = req.user!.id;

      await adminAddCredits(userId, credits, adminUserId, note);
      await AdminService.autoCloseOpenPlanRequest(userId, adminUserId, "credits_added");
      return reply.send({ ok: true });
    }
  );

  /**
   * POST /admin/users/:userId/credits/reset
   * Reset a user's current cycle to their plan's base allowance.
   * Auto-closes any open credit request on the user.
   */
  app.post(
    "/users/:userId/credits/reset",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { params: AdminUserIdParams },
    },
    async (req, reply) => {
      const { userId }  = req.params as AdminUserIdParamsType;
      const adminUserId = req.user!.id;

      await adminResetCycle(userId, adminUserId);
      await AdminService.autoCloseOpenPlanRequest(userId, adminUserId, "credits_reset");
      return reply.send({ ok: true });
    }
  );

  /**
   * POST /admin/users/:userId/requests/:requestId/decline
   * Decline a user's open credit request.
   */
  app.post(
    "/users/:userId/requests/:requestId/decline",
    {
      preHandler: [requireAuth, requireVerifiedEmail, requireAdmin],
      schema:     { params: AdminUserRequestParams },
    },
    async (req, reply) => {
      const { requestId } = req.params as AdminUserRequestParamsType;
      const result        = await AdminService.declinePlanRequest(requestId);
      return reply.send(result);
    }
  );

}