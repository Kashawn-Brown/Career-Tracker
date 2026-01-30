// users.ts: small API helpers for user account actions.
import { apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { ChangePasswordRequest, OkResponse } from "@/types/api";

export const usersApi = {
  changePassword(body: ChangePasswordRequest) {
    return apiFetch<OkResponse>(routes.users.changePassword(), {
      method: "POST",
      body,
    });
  },

  deactivateMe() {
    return apiFetch<OkResponse>(routes.users.deactivate(), {
      method: "DELETE",
    });
  },

  deleteMe() {
    return apiFetch<OkResponse>(routes.users.delete(), {
      method: "DELETE",
    });
  },
};
