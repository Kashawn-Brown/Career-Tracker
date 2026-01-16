import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ApplicationDraftResponse } from "@/types/api";

/**
 * Mini client with small helpers for AI endpoints.
 * 
 * So UI components don’t have to repeat apiFetch(...) details everywhere (can just call here)
 * Centralizes the endpoint calls so UI code is cleaner and easier to maintain.
 */


/**
 * Extract job information from a job description.
 */
export const aiApi = {
  applicationFromJd(text: string) {
    return apiFetch<ApplicationDraftResponse>(routes.ai.applicationFromJd(), {
      method: "POST",
      body: { text },
    });
  },
};
