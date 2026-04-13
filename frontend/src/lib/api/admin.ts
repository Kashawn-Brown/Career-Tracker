import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  OkResponse,
  UserPlan,
  AdminUsersListResponse,
  UpdateUserPlanRequest,
  AdminUserDetail,
  UpdateUserStatusRequest,
  UsageState,
} from "@/types/api";

export const adminApi = {

  /**
   * List users for admin with optional filters.
   */
  listUsers(params?: {
    q?: string;
    role?: string;
    plan?: string;
    isActive?: boolean;
    hasPendingRequest?: boolean;
    sortBy?: "lastActiveAt" | "createdAt";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.q)                      search.set("q",                 params.q);
    if (params?.role)                   search.set("role",              params.role);
    if (params?.plan)                   search.set("plan",              params.plan);
    if (params?.isActive !== undefined) search.set("isActive",          String(params.isActive));
    if (params?.hasPendingRequest)      search.set("hasPendingRequest", "true");
    if (params?.sortBy)                 search.set("sortBy",            params.sortBy);
    if (params?.sortDir)                search.set("sortDir",           params.sortDir);
    if (params?.page)                   search.set("page",              String(params.page));
    if (params?.pageSize)               search.set("pageSize",          String(params.pageSize));

    const qs = search.toString();
    return apiFetch<AdminUsersListResponse>(
      `${routes.admin.listUsers()}${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
  },

  /**
   * Get a single user's details by userId.
   */
  getUserDetail(userId: string) {
    return apiFetch<AdminUserDetail>(routes.admin.getUserDetail(userId), { method: "GET" });
  },

  /**
   * Get a user's current plan usage state.
   */
  getUserUsage(userId: string) {
    return apiFetch<UsageState>(routes.admin.getUserUsage(userId), { method: "GET" });
  },

  /**
   * Update a user's plan by userId.
   */
  updateUserPlan(userId: string, plan: UserPlan) {
    return apiFetch<OkResponse>(routes.admin.updateUserPlan(userId), {
      method: "PATCH",
      body: { plan } satisfies UpdateUserPlanRequest,
    });
  },

  /**
   * Update a user's active status by userId.
   */
  updateUserStatus(userId: string, isActive: boolean) {
    return apiFetch<OkResponse>(routes.admin.updateUserStatus(userId), {
      method: "PATCH",
      body: { isActive } satisfies UpdateUserStatusRequest,
    });
  },

  /**
   * Add bonus credits to a user's current cycle.
   */
  addUserCredits(userId: string, credits: number, note?: string) {
    return apiFetch<OkResponse>(routes.admin.addUserCredits(userId), {
      method: "POST",
      body:   JSON.stringify({ credits, note }),
    });
  },

  /**
   * Reset a user's current cycle to their plan's base allowance.
   */
  resetUserCredits(userId: string) {
    return apiFetch<OkResponse>(routes.admin.resetUserCredits(userId), {
      method: "POST",
    });
  },

  /**
   * Decline a user's open credit request.
   */
  declinePlanRequest(userId: string, requestId: string) {
    return apiFetch<OkResponse>(routes.admin.declineRequest(userId, requestId), {
      method: "POST",
    });
  },

};