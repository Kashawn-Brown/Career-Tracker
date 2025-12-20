// documents.ts: tiny API helpers for base resume endpoints (keeps components simpler).
import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  OkResponse,
  GetBaseResumeResponse,
  UpsertBaseResumeRequest,
  UpsertBaseResumeResponse,
} from "@/types/api";

export const documentsApi = {

    // Fetches the current base resume metadata for the logged-in user.
    getBaseResume() {
        return apiFetch<GetBaseResumeResponse>(routes.documents.baseResume(), { method: "GET" });
    },

    // Creates/replaces the base resume metadata for the logged-in user
    upsertBaseResume(body: UpsertBaseResumeRequest) {
        return apiFetch<UpsertBaseResumeResponse>(routes.documents.baseResume(), {
            method: "POST",
            body,
        });
    },

    // Deletes the base resume metadata for the logged-in user.
    deleteBaseResume() {
        return apiFetch<OkResponse>(routes.documents.baseResume(), { method: "DELETE" });
    }

}