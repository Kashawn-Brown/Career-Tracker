import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type {
  RequestProBody,
  RequestProResponse,
} from "@/types/api";

export const proApi = {

    /**
     * User: request Pro access.
     */
    requestPro(body: RequestProBody) {
    return apiFetch<RequestProResponse>(routes.pro.request(), {
        method: "POST",
        body,
    });
    }    




}