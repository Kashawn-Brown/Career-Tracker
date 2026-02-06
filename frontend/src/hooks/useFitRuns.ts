"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { applicationsApi } from "@/lib/api/applications";
import { documentsApi } from "@/lib/api/documents";
import type { AiArtifact, FitV1Payload } from "@/types/api";

export type FitRunStepKey = "UPLOAD_OVERRIDE" | "RUN_COMPATIBILITY";

export type FitRunStep = {
  key: FitRunStepKey;
  label: string;
};

export type FitRunStatus = "idle" | "running" | "success" | "error" | "cancelled";

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

  // Reserved for later UI polish
  hint?: string;
};

export type FitRunsController = {
  runsByAppId: Record<string, FitRunState>;
  getRun: (applicationId: string) => FitRunState | null;
  startFitRun: (args: StartFitRunArgs) => Promise<AiArtifact<FitV1Payload> | null>;

  // Clears a run entry (useful for dismissing background errors).
  clearRun: (applicationId: string) => void;

  cancelRun: (applicationId: string) => void;
};


export function useFitRuns(): FitRunsController {
  const [runsByAppId, setRunsByAppId] = useState<Record<string, FitRunState>>({});

  const abortControllersRef = useRef<Record<string, AbortController>>({});

  // Tracks the override doc uploaded for the current run (so Cancel can clean it up).
  const uploadedOverrideDocIdRef = useRef<Record<string, number>>({});

  // Keeps the latest onDocumentsChanged callback for an in-flight run (so cancel can refresh UI).
  const onDocumentsChangedRef = useRef<Record<string, ((applicationId: string) => void) | undefined>>({});


  const getRun = useCallback(
    (applicationId: string) => runsByAppId[applicationId] ?? null,
    [runsByAppId]
  );

  const clearRun = useCallback((applicationId: string) => {
    setRunsByAppId((prev) => {
      if (!prev[applicationId]) return prev;

      const next = { ...prev };
      delete next[applicationId];
      return next;
    });
  }, []);


  async function cleanupOverrideDoc(applicationId: string) {
    const docId = uploadedOverrideDocIdRef.current[applicationId];
    if (!docId) return;
  
    // Prevent double-delete attempts (cancelRun + catch)
    delete uploadedOverrideDocIdRef.current[applicationId];
  
    try {
      await documentsApi.deleteById(docId);
  
      // Refresh docs list if the caller provided a refresh hook
      onDocumentsChangedRef.current[applicationId]?.(applicationId);
    } catch (err) {
      // Best-effort cleanup; don't block cancellation UX.
      console.warn("Failed to cleanup override doc after cancel:", err);
    }
  }  


  const cancelRun = useCallback((applicationId: string) => {
    const controller = abortControllersRef.current[applicationId];
    if (controller) controller.abort();
  
    // Mark as cancelled (if it exists + was running)
    setRunsByAppId((prev) => {
      const current = prev[applicationId];
      if (!current) return prev;
      if (current.status !== "running") return prev;
  
      return {
        ...prev,
        [applicationId]: {
          ...current,
          status: "cancelled",
          errorMessage: null,
        },
      };
    });
  
    delete abortControllersRef.current[applicationId];

    // Best-effort cleanup if override file was uploaded for this run.
    void cleanupOverrideDoc(applicationId);
  }, []);
  


  const startFitRun = useCallback(
    async (args: StartFitRunArgs) => {
      const {
        applicationId,
        overrideFile,
        onDocumentsChanged,
        onApplicationChanged,
        onRefreshMe,
      } = args;

      onDocumentsChangedRef.current[applicationId] = onDocumentsChanged;

      // Prevent double-start for the same application.
      const existing = runsByAppId[applicationId];
      if (existing?.status === "running") return null;

      const steps: FitRunStep[] = [];
      if (overrideFile) {
        steps.push({ key: "UPLOAD_OVERRIDE", label: "Uploading override resume" });
      }
      steps.push({ key: "RUN_COMPATIBILITY", label: "Generating compatibility report" });

      const runStepIndex = overrideFile ? 1 : 0;
      
      // Create a controller and pass signals
      const controller = new AbortController();
      abortControllersRef.current[applicationId] = controller;

      // Create the run state (this is the initial state - NOT a guarded update).
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

      // Small helper: safely update an existing run state.
      const safeUpdateRun = (updater: (current: FitRunState) => FitRunState) => {
        setRunsByAppId((prev) => {
          const current = prev[applicationId];
          if (!current) return prev;

          return {
            ...prev,
            [applicationId]: updater(current),
          };
        });
      };
      
      
      let sourceDocumentId: number | undefined = undefined;

      try {
        // Step 1 (optional): upload override
        if (overrideFile) {
          safeUpdateRun((current) => ({ ...current, activeIndex: 0 }));

          const uploadRes = await applicationDocumentsApi.upload(
            { applicationId, kind: "CAREER_HISTORY", file: overrideFile, },
            { signal: controller.signal }
          
          );

          const docId = Number(uploadRes.document.id);
          uploadedOverrideDocIdRef.current[applicationId] = docId;
  
          if (!Number.isFinite(docId)) {
            throw new Error("Override upload returned an invalid document id.");
          }

          sourceDocumentId = docId;
          onDocumentsChanged?.(applicationId);

          // Move to the generate step
          safeUpdateRun((current) => ({ ...current, activeIndex: runStepIndex }));
        }

        // Step 2: generate FIT artifact
        safeUpdateRun((current) => ({ ...current, activeIndex: runStepIndex }));

        const created = await applicationsApi.generateAiArtifact(
          applicationId, 
          { kind: "FIT_V1", sourceDocumentId, }, 
          { signal: controller.signal }
      );

        // Mark success
        safeUpdateRun((current) => ({
          ...current,
          status: "success",
          activeIndex: runStepIndex,
          errorMessage: null,
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

        delete abortControllersRef.current[applicationId];

        delete onDocumentsChangedRef.current[applicationId];
        delete uploadedOverrideDocIdRef.current[applicationId]; // only clears tracking, does NOT delete the doc


        return created as AiArtifact<FitV1Payload>;

      } catch (err) {
        const isAbort =
          err instanceof DOMException
            ? err.name === "AbortError"
            : err instanceof Error
              ? err.name === "AbortError" || /abort/i.test(err.message)
              : false;
      
        if (isAbort) {
          safeUpdateRun((current) => ({
            ...current,
            status: "cancelled",
            errorMessage: null,
          }));
      
          delete abortControllersRef.current[applicationId];

          await cleanupOverrideDoc(applicationId);

          return null;
        }
      
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to generate compatibility report.";
      
        safeUpdateRun((current) => ({
          ...current,
          status: "error",
          errorMessage: message,
        }));
      
        delete abortControllersRef.current[applicationId];
        
        delete onDocumentsChangedRef.current[applicationId];
        delete uploadedOverrideDocIdRef.current[applicationId];

        throw err;
      }
    },
    [runsByAppId]
  );

  return {
    runsByAppId,
    getRun,
    startFitRun,
    clearRun,
    cancelRun,
  };
}
