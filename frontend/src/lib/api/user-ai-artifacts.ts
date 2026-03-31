import { apiFetch } from "@/lib/api/client";
import { routes }   from "@/lib/api/routes";
import type { UserAiArtifact, UserAiArtifactKind } from "@/types/api";

export const userAiArtifactsApi = {
  list(args?: { kind?: UserAiArtifactKind }) {
    return apiFetch<{ artifacts: UserAiArtifact[] }>(
      routes.userAiArtifacts.list(args),
      { method: "GET" }
    );
  },

  delete(id: string) {
    return apiFetch<void>(routes.userAiArtifacts.delete(id), { method: "DELETE" });
  },
};