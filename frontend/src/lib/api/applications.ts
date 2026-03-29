import { apiFetch, apiFetchBlob } from "@/lib/api/client";
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
  ExportApplicationsCsvParams, 
} from "@/types/api";


type ApplicationEnvelope = { application: Application };

/**
 * Builds URLSearchParams for application list/export queries.
 * Shared between list() and exportCsv() so serialization never drifts.
 *
 * opts.includePagination — set false for export (no page/pageSize)
 */
function buildApplicationsSearchParams(
  params: Omit<ListApplicationsParams, "page" | "pageSize"> & {
    page?:     number;
    pageSize?: number;
  },
  opts: { includePagination: boolean } = { includePagination: true }
): URLSearchParams {
  const search = new URLSearchParams();

  if (opts.includePagination) {
    if (params.page     != null) search.set("page",     String(params.page));
    if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  }

  if (params.q?.trim())        search.set("q",        params.q.trim());

  if (params.statuses?.length)  search.set("statuses",  params.statuses.join(","));
  if (params.jobTypes?.length)  search.set("jobTypes",  params.jobTypes.join(","));
  if (params.workModes?.length) search.set("workModes", params.workModes.join(","));

  if (params.sortBy)  search.set("sortBy",  params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);

  if (params.favoritesOnly) search.set("isFavorite", "true");

  if (typeof params.fitMin === "number") search.set("fitMin", String(params.fitMin));
  if (typeof params.fitMax === "number") search.set("fitMax", String(params.fitMax));

  if (params.dateAppliedFrom) search.set("dateAppliedFrom", params.dateAppliedFrom);
  if (params.dateAppliedTo)   search.set("dateAppliedTo",   params.dateAppliedTo);
  if (params.updatedFrom)     search.set("updatedFrom",     params.updatedFrom);
  if (params.updatedTo)       search.set("updatedTo",       params.updatedTo);

  return search;
}

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
    const search = buildApplicationsSearchParams(params, { includePagination: true });

    return apiFetch<ApplicationsListResponse>(
      `${routes.applications.list()}?${search.toString()}`,
      { method: "GET" }
    );
  },

  /**
   * Exports all applications matching the current filters and sort as a CSV file.
   * Not limited to the current page — fetches all matching rows from the backend.
   */
  exportCsv(params: ExportApplicationsCsvParams) {
    const search = buildApplicationsSearchParams(
      {
        ...params,
        // ExportApplicationsCsvParams uses favoritesOnly, list uses it too
        favoritesOnly: params.isFavorite,
      },
      { includePagination: false }
    );

    if (params.columns?.length) {
      search.set("columns", params.columns.join(","));
    }

    return apiFetchBlob(
      `${routes.applications.exportCsv()}?${search.toString()}`
    );
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

  generateAiArtifact(applicationId: string, body: { kind: AiArtifactKind; sourceDocumentId?: number }, opts?: { signal?: AbortSignal }) {
    return apiFetch<AiArtifact>(routes.applications.aiArtifacts.create(applicationId), {
      method: "POST",
      body,
      signal: opts?.signal,
    });
  },
  
  listAiArtifacts(applicationId: string, args?: { kind?: AiArtifactKind; all?: boolean }) {
    return apiFetch<AiArtifact[]>(routes.applications.aiArtifacts.list(applicationId, args), {
      method: "GET",
    });
  },
  

  
};
