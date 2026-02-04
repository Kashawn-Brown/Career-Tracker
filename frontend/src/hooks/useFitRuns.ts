"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { applicationsApi } from "@/lib/api/applications";
import type { AiArtifact, FitV1Payload } from "@/types/api";

export type FitRunStepKey = "UPLOAD_OVERRIDE" | "RUN_COMPATIBILITY";

export type FitRunStep = {
  key: FitRunStepKey;
  label: string;
};

export type FitRunStatus = "idle" | "running" | "success" | "error";

export type FitRunState = {
  applicationId: string;
  status: FitRunStatus;
  steps: FitRunStep[];
  activeIndex: number;
  startedAt: number;
  errorMessage?: string | null;
};

// Inputs to start a run (kept small so it’s easy to call from the drawer).
export type StartFitRunArgs = {
  applicationId: string;

  // Optional override resume upload (CAREER_HISTORY on the application)
  overrideFile?: File | null;

  // If we upload an override doc, we can ping the rest of the UI to refresh doc lists.
  onDocumentsChanged?: (applicationId: string) => void;

  // On completion, we want to refresh table row / drawer application.
  onApplicationChanged?: (applicationId: string) => void;

  // On completion, refresh auth so credits/pro flags update.
  onRefreshMe?: () => void;

  // If needed later, you can pass a short hint string for UI (“Please keep this tab open.”)
  hint?: string;
};

export function useFitRuns() {
  const [runsByAppId, setRunsByAppId] = useState<Record<string, FitRunState>>({});

  const getRun = useCallback(
    (applicationId: string) => runsByAppId[applicationId] ?? null,
    [runsByAppId]
  );

  const startFitRun = useCallback(async (args: StartFitRunArgs) => {
    const {
      applicationId,
      overrideFile,
      onDocumentsChanged,
      onApplicationChanged,
      onRefreshMe,
    } = args;

    // Prevent double-start for the same application.
    const existing = runsByAppId[applicationId];
    if (existing?.status === "running") return null;

    const steps: FitRunStep[] = [];

    if (overrideFile) {
      steps.push({ key: "UPLOAD_OVERRIDE", label: "Uploading override resume" });
    }
    steps.push({ key: "RUN_COMPATIBILITY", label: "Generating compatibility report" });

    // Start tracking this run.
    setRunsByAppId((prev) => ({
      ...prev,
      [applicationId]: {
        applicationId,
        status: "running",
        steps,
        activeIndex: 0,
        startedAt: Date.now(),
        errorMessage: null,
      },
    }));

    try {
      let sourceDocumentId: number | undefined = undefined;

      // Step 1 (optional): upload override
      if (overrideFile) {
        setRunsByAppId((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            activeIndex: 0,
          },
        }));

        const uploadRes = await applicationDocumentsApi.upload({
          applicationId,
          kind: "CAREER_HISTORY",
          file: overrideFile,
        });

        const docId = Number(uploadRes.document.id);
        if (!Number.isFinite(docId)) {
          throw new Error("Override upload returned an invalid document id.");
        }

        sourceDocumentId = docId;
        onDocumentsChanged?.(applicationId);

        // Move to next step
        setRunsByAppId((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            activeIndex: 1,
          },
        }));
      }

      // Step 2: generate FIT artifact
      if (!overrideFile) {
        setRunsByAppId((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            activeIndex: 0,
          },
        }));
      }

      const created = await applicationsApi.generateAiArtifact(applicationId, {
        kind: "FIT_V1",
        sourceDocumentId,
      });

      // Mark success
      setRunsByAppId((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          status: "success",
          activeIndex: steps.length - 1,
          errorMessage: null,
        },
      }));

      // Kick refreshes (non-blocking)
      try {
        onRefreshMe?.();
      } catch {
        // non-blocking
      }

      try {
        onApplicationChanged?.(applicationId);
      } catch {
        // non-blocking
      }

      return created as AiArtifact<FitV1Payload>;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate compatibility report.";

      setRunsByAppId((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          status: "error",
          errorMessage: message,
        },
      }));

      throw err;
    }
  }, [runsByAppId]);

  return {
    runsByAppId,
    getRun,
    startFitRun,
  };
}
