import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  OkResponse,
  ConnectionResponse,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ListConnectionsParams,
  ListConnectionsResponse,
} from "@/types/api";

// Mini client with small helpers for connection endpoints.
export const connectionsApi = {

  /**
   * Create a new connection for the current user.
   */
  createConnection(connection: CreateConnectionRequest) {
    return apiFetch<ConnectionResponse>(routes.connections.create(), {
      method: "POST",
      body: connection,
    });
  },

  /**
   * List the current users connections.
   */
  listConnections(params: ListConnectionsParams) {
    const searchParams = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })

    if (params.q?.trim()) searchParams.set("q", params.q.trim());
    if (params.name) searchParams.set("name", params.name);
    if (params.company) searchParams.set("company", params.company);
    if (params.relationship) searchParams.set("relationship", params.relationship);
    if (params.status !== undefined) searchParams.set("status", params.status ? "true" : "false");
    
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortDir) searchParams.set("sortDir", params.sortDir);


    // Build the URL with the search params.
    return apiFetch<ListConnectionsResponse>(`${routes.connections.list()}?${searchParams.toString()}`, {
      method: "GET",
    });
  },

  /**
   * Get a connection by id.
   */
  getConnection(id: string) {
    return apiFetch<ConnectionResponse>(routes.connections.byId(id), {
      method: "GET",
    });
  },

  /**
   * Update a connection.
   */
  updateConnection(id: string, connection: UpdateConnectionRequest) {
    return apiFetch<ConnectionResponse>(routes.connections.update(id), {
      method: "PATCH",
      body: connection,
    });
  },

  /**
   * Delete a connection.
   */
  deleteConnection(id: string) {
    return apiFetch<OkResponse>(routes.connections.delete(id), {
      method: "DELETE",
    });
  },


};