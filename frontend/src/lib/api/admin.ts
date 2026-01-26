import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  AdminProRequestsListResponse,
  AdminDecisionBody,
  OkResponse,
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

}








