import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  AdminOverviewResponse,
  AdminAiUsageResponse,
  AdminActivityResponse,
  AdminUserAnalyticsResponse,
  UserActivityOverviewResponse,
  DateWindow,
} from "@/types/api";

export const analyticsApi = {

  // ── Admin ──────────────────────────────────────────────────────────────────

  getAdminOverview(window?: DateWindow) {
    return apiFetch<AdminOverviewResponse>(routes.analytics.adminOverview(window), {
      method: "GET",
    });
  },

  getAdminAiUsage(window?: DateWindow) {
    return apiFetch<AdminAiUsageResponse>(routes.analytics.adminAi(window), {
      method: "GET",
    });
  },

  getAdminActivity() {
    return apiFetch<AdminActivityResponse>(routes.analytics.adminActivity(), {
      method: "GET",
    });
  },

  getAdminUserAnalytics(userId: string, window?: DateWindow) {
    return apiFetch<AdminUserAnalyticsResponse>(
      routes.analytics.adminUserAnalytics(userId, window),
      { method: "GET" }
    );
  },

  // ── User ───────────────────────────────────────────────────────────────────

  getMyOverview(window?: DateWindow) {
    return apiFetch<UserActivityOverviewResponse>(routes.analytics.meOverview(window), {
      method: "GET",
    });
  },
};