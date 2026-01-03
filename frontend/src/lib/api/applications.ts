import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { OkResponse, UpdateApplicationRequest, ListApplicationsParams, ApplicationsListResponse, Application, CreateApplicationRequest } from "@/types/api";

/**
 * Mini client with small helpers for application endpoints.
 * 
 * So UI components don’t have to repeat apiFetch(...) details everywhere (can just call here)
 * Centralizes the endpoint calls so UI code is cleaner
 */
export const applicationsApi = {

  /**
   * Fetch paginated applications with optional filters and sorting.
   */
  list(params: ListApplicationsParams) {
    
    const searchParams = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });

    if (params.q?.trim()) searchParams.set("q", params.q.trim());
    if (params.status && params.status !== "ALL") searchParams.set("status", params.status);

    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortDir) searchParams.set("sortDir", params.sortDir);

    if (params.jobType && params.jobType !== "ALL") searchParams.set("jobType", params.jobType);
    if (params.workMode && params.workMode !== "ALL") searchParams.set("workMode", params.workMode);

    // backend expects isFavorite=true/false strings
    if (params.favoritesOnly) searchParams.set("isFavorite", "true");

    // Call the backend API to get the paginated applications. (with search params in the URL).
    return apiFetch<ApplicationsListResponse>(`${routes.applications.list()}?${searchParams.toString()}`, {
      method: "GET",
    });
  },

  /**
   * Create a new application.
   */
  create(body: CreateApplicationRequest) {
    return apiFetch<Application>(routes.applications.create(), {
      method: "POST",
      body,
    });
  
  },

  /**
   * Update an application. Accepts any subset of UpdateApplicationRequest.
   * Returns the updated Application (assuming backend responds with it).
   */
  update(id: string, patch: Partial<UpdateApplicationRequest>) {
    return apiFetch<Application>(routes.applications.byId(id), {
      method: "PATCH",
      body: patch,
    });
  },

  /**
   * Convenience wrapper for the current UI (status dropdown).
   */
  updateStatus(id: string, status: UpdateApplicationRequest["status"]) {
    return apiFetch(routes.applications.byId(id), {
      method: "PATCH",
      body: { status } satisfies UpdateApplicationRequest,  // checks that { status } matches the UpdateApplicationRequest shape
    });
  },

  /**
   * Delete an application.
   */
  remove(id: string) {
    return apiFetch<OkResponse>(routes.applications.byId(id), { method: "DELETE" });
  },
};
