import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  AdminProRequestsListResponse,
  AdminDecisionBody,
  OkResponse,
  UserPlan, 
  AdminUsersListResponse, 
  UpdateUserPlanRequest,
  AdminUserDetail,
  UpdateUserStatusRequest,
} from "@/types/api";

export const adminApi = {

  /**
   * List all user's Pro requests.
   */
  listProRequests() {
    return apiFetch<AdminProRequestsListResponse>(routes.admin.listProRequests(), {
      method: "GET",
    });
  },

  /**
   * Approve a user's Pro request by requestId.
   */
  approveProRequest(requestId: string, body: AdminDecisionBody) {
    return apiFetch<OkResponse>(routes.admin.approveProRequest(requestId), {
      method: "POST",
      body,
    });
  },

  /**
   * Deny a user's Pro request by requestId.
   */
  denyProRequest(requestId: string, body: AdminDecisionBody) {
    return apiFetch<OkResponse>(routes.admin.denyProRequest(requestId), {
      method: "POST",
      body,
    });
  },

  /**
   * Grant more free AI credits to a user by requestId.
   */
  grantCredits(requestId: string) {
    return apiFetch<OkResponse>(routes.admin.grantCredits(requestId), {
      method: "POST",
    });
  },

  /**
   * List users for admin with optional filters.
   */
  listUsers(params?: {
    q?: string;
    role?: string;
    plan?: string;
    page?: number;
    pageSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.q)        search.set("q",        params.q);
    if (params?.role)     search.set("role",      params.role);
    if (params?.plan)     search.set("plan",      params.plan);
    if (params?.page)     search.set("page",      String(params.page));
    if (params?.pageSize) search.set("pageSize",  String(params.pageSize));

    const qs = search.toString();
    return apiFetch<AdminUsersListResponse>(
      `${routes.admin.listUsers()}${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    );
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
   * Get a single user's details by userId.
   */
  getUserDetail(userId: string) {
    return apiFetch<AdminUserDetail>(routes.admin.getUserDetail(userId), { method: "GET" });
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

}








