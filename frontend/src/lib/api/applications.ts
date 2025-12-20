import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { UpdateApplicationRequest } from "@/types/api";

/**
 * Mini client with small helpers for application endpoints.
 * 
 * So UI components don’t have to repeat apiFetch(...) details everywhere (can just call here)
 * Centralizes the endpoint calls so UI code is cleaner
 */
export const applicationsApi = {


  updateStatus(id: string, status: UpdateApplicationRequest["status"]) {
    return apiFetch(routes.applications.byId(id), {
      method: "PATCH",
      body: { status } satisfies UpdateApplicationRequest,  // checks that { status } matches the UpdateApplicationRequest shape
    });
  },

  remove(id: string) {
    return apiFetch(routes.applications.byId(id), { method: "DELETE" });
  },
};
