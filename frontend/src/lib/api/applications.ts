import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { 
  OkResponse, 
  UpdateApplicationRequest, 
  ListApplicationsParams, 
  ApplicationsListResponse, 
  Application, 
  CreateApplicationRequest,
  ListApplicationConnectionsResponse,
  AiArtifactKind,
  AiArtifact,
} from "@/types/api";

//
type ApplicationEnvelope = { application: Application };

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
    return apiFetch<ApplicationEnvelope>(routes.applications.create(), {
      method: "POST",
      body,
    }).then(response => response.application);
  
  },

  /**
   * Update an application. Accepts any subset of UpdateApplicationRequest.
   * Returns the updated Application (assuming backend responds with it).
   */
  update(id: string, patch: Partial<UpdateApplicationRequest>) {
    return apiFetch<ApplicationEnvelope>(routes.applications.byId(id), {
      method: "PATCH",
      body: patch,
    }).then(response => response.application);
  },

  /**
   * Get an application by id.
   */
  get(id: string) {
    return apiFetch<ApplicationEnvelope>(routes.applications.byId(id), {
      method: "GET",
    }).then(response => response.application);
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



  /** ---- Application <-> Connection ---- */

  /**
   * List the connections attached to an application.
   */
  listApplicationConnections(applicationId: string) {
    return apiFetch<ListApplicationConnectionsResponse>(routes.applications.connections.list(applicationId), {
      method: "GET",
    });
  },

  /**
   * Attach a connection to an application.
   */
  attachConnectionToApplication(applicationId: string, connectionId: string) {
    return apiFetch<OkResponse>(routes.applications.connections.create(applicationId, connectionId), {
      method: "POST",
    });
  },

  /**
   * Remove a connection from an application.
   */
  removeConnectionFromApplication(applicationId: string, connectionId: string) {
    return apiFetch<OkResponse>(routes.applications.connections.delete(applicationId, connectionId), {
      method: "DELETE",
    });
  },



  /** ---- AI Artifacts ---- */

  generateAiArtifact(applicationId: string, body: { kind: AiArtifactKind; sourceDocumentId?: number }) {
    return apiFetch<AiArtifact>(routes.applications.aiArtifacts.create(applicationId), {
      method: "POST",
      body,
    });
  },
  
  listAiArtifacts(applicationId: string, args?: { kind?: AiArtifactKind; all?: boolean }) {
    return apiFetch<AiArtifact[]>(routes.applications.aiArtifacts.list(applicationId, args), {
      method: "GET",
    });
  },
  

  
};
