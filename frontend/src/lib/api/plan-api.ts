import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { RequestCreditsBody, RequestCreditsResponse } from "@/types/api";

export const planApi = {

  /**
   * User: request more AI credits.
   */
  requestCredits(body: RequestCreditsBody) {
    return apiFetch<RequestCreditsResponse>(routes.plan.request(), {
      method: "POST",
      body,
    });
  },

};