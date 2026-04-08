/**
 * analytics.routes.ts
 *
 * Admin and user analytics endpoints.
 *
 * Admin routes: /analytics/admin/* — require ADMIN role
 * User routes:  /analytics/me/*    — scoped to the authenticated user
 *
 * Tracking is write-only via internal helpers (analytics-tracker, ai-run-tracker).
 * There are no public write routes here.
 */

import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import * as AnalyticsService from "./analytics.service.js";
import type { DateWindow } from "./analytics.service.js";
import { AppError } from "../../errors/app-error.js";

const VALID_WINDOWS: DateWindow[] = ["7d", "30d", "all"];

function parseWindow(raw: unknown): DateWindow {
  if (typeof raw === "string" && VALID_WINDOWS.includes(raw as DateWindow)) {
    return raw as DateWindow;
  }
  return "30d"; // safe default
}

export async function analyticsRoutes(app: FastifyInstance) {

  // ─── Admin routes ──────────────────────────────────────────────────────────

  /**
   * GET /analytics/admin/overview
   * Summary cards: users, applications, AI runs, artifacts.
   */
  app.get(
    "/admin/overview",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAdmin] },
    async (req) => {
      const window = parseWindow((req.query as Record<string, unknown>).window);
      return AnalyticsService.getAdminOverview(window);
    }
  );

  /**
   * GET /analytics/admin/ai
   * AI usage breakdown: by tool, scope, plan, status, top users, recent failures.
   */
  app.get(
    "/admin/ai",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAdmin] },
    async (req) => {
      const window = parseWindow((req.query as Record<string, unknown>).window);
      return AnalyticsService.getAdminAiUsage(window);
    }
  );

  /**
   * GET /analytics/admin/activity
   * Recent AI runs and product events across all users.
   */
  app.get(
    "/admin/activity",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAdmin] },
    async () => {
      return AnalyticsService.getAdminRecentActivity(50);
    }
  );

  /**
   * GET /analytics/admin/users/:userId
   * Per-user analytics drilldown: runs, artifacts, events, account info.
   */
  app.get(
    "/admin/users/:userId",
    { preHandler: [requireAuth, requireVerifiedEmail, requireAdmin] },
    async (req) => {
      const { userId } = req.params as { userId: string };
      const window = parseWindow((req.query as Record<string, unknown>).window);
      const result = await AnalyticsService.getAdminUserAnalytics(userId, window);
      if (!result) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
      return result;
    }
  );


  // ─── User self-analytics routes ────────────────────────────────────────────

  /**
   * GET /analytics/me/overview
   * Personal usage summary: application count, AI runs by tool, artifact counts.
   */
  app.get(
    "/me/overview",
    { preHandler: [requireAuth, requireVerifiedEmail] },
    async (req) => {
      const userId = req.user!.id;
      const window = parseWindow((req.query as Record<string, unknown>).window);
      return AnalyticsService.getUserActivityOverview(userId, window);
    }
  );
}