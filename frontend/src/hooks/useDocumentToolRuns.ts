"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError }         from "@/lib/api/client";
import { applicationsApi }  from "@/lib/api/applications";
import type { AiArtifact } from "@/types/api";

// The two tool kinds this hook manages
export type DocumentToolKind = "RESUME_ADVICE" | "COVER_LETTER";

export type DocumentToolRunStatus = "idle" | "running" | "success" | "error" | "cancelled";

export type DocumentToolRunState = {
  applicationId: string;
  kind:          DocumentToolKind;
  status:        DocumentToolRunStatus;
  // Single-step progress (no upload step — that's handled synchronously before the run starts)
  label:         string;
  startedAt:     number;
  errorMessage?: string | null;
};

export type StartDocumentToolRunArgs = {
  applicationId:   string;
  kind:            DocumentToolKind;
  templateText?:   string;  // cover letter only
  sourceDocumentId?: number; // override resume doc already attached to application

  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe?:          () => void;
};

// Return type — one controller for both tool kinds
export type DocumentToolRunsController = {
  runsByAppId: Record<string, DocumentToolRunState>;
  getRun:      (applicationId: string, kind: DocumentToolKind) => DocumentToolRunState | null;
  startRun:    (args: StartDocumentToolRunArgs) => Promise<AiArtifact | null>;
  clearRun:    (applicationId: string, kind: DocumentToolKind) => void;
  cancelRun:   (applicationId: string, kind: DocumentToolKind) => void;
};

// Composite key so Resume Advice and Cover Letter runs for the same app don't collide
function runKey(applicationId: string, kind: DocumentToolKind) {
  return `${applicationId}::${kind}`;
}

/**
 * useDocumentToolRuns — manages background runs for Resume Advice and Cover Letter.
 *
 * Mirrors useFitRuns in structure:
 *   - Survives drawer close (state lives on the page, not in the drawer)
 *   - Supports cancel via AbortController
 *   - Exposes run status for progress UI in the drawer cards
 *   - Page-level effect watches for completion and fires notifications
 */
export function useDocumentToolRuns(): DocumentToolRunsController {
  const [runsByAppId, setRunsByAppId] = useState<Record<string, DocumentToolRunState>>({});

  // AbortController per run key — allows cancellation
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const getRun = useCallback(
    (applicationId: string, kind: DocumentToolKind) =>
      runsByAppId[runKey(applicationId, kind)] ?? null,
    [runsByAppId]
  );

  const clearRun = useCallback((applicationId: string, kind: DocumentToolKind) => {
    const key = runKey(applicationId, kind);
    setRunsByAppId((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const cancelRun = useCallback((applicationId: string, kind: DocumentToolKind) => {
    const key        = runKey(applicationId, kind);
    const controller = abortControllersRef.current[key];
    if (controller) controller.abort();

    setRunsByAppId((prev) => {
      const current = prev[key];
      if (!current || current.status !== "running") return prev;
      return { ...prev, [key]: { ...current, status: "cancelled", errorMessage: null } };
    });

    delete abortControllersRef.current[key];
  }, []);

  const startRun = useCallback(
    async (args: StartDocumentToolRunArgs): Promise<AiArtifact | null> => {
      const { applicationId, kind, templateText, sourceDocumentId, onApplicationChanged, onRefreshMe } = args;
      const key = runKey(applicationId, kind);

      // Prevent double-start
      if (runsByAppId[key]?.status === "running") return null;

      const label = kind === "RESUME_ADVICE"
        ? "Generating resume advice…"
        : "Generating cover letter…";

      const controller = new AbortController();
      abortControllersRef.current[key] = controller;

      // Set initial running state
      setRunsByAppId((prev) => ({
        ...prev,
        [key]: {
          applicationId,
          kind,
          status:    "running",
          label,
          startedAt: Date.now(),
          errorMessage: null,
        },
      }));

      // Helper: safely update this run's state without touching others
      const safeUpdate = (updater: (s: DocumentToolRunState) => DocumentToolRunState) => {
        setRunsByAppId((prev) => {
          const current = prev[key];
          if (!current) return prev;
          return { ...prev, [key]: updater(current) };
        });
      };

      try {
        const artifact = await applicationsApi.generateAiArtifact(
          applicationId,
          {
            kind,
            templateText,
            sourceDocumentId,
          },
          { signal: controller.signal }
        );

        safeUpdate((s) => ({ ...s, status: "success", errorMessage: null }));

        // Non-blocking post-success refreshes
        try { onRefreshMe?.(); }          catch { /* non-blocking */ }
        try { onApplicationChanged?.(applicationId); } catch { /* non-blocking */ }

        delete abortControllersRef.current[key];
        return artifact;

      } catch (err) {
        const isAbort =
          err instanceof DOMException
            ? err.name === "AbortError"
            : err instanceof Error
              ? err.name === "AbortError" || /abort/i.test(err.message)
              : false;

        if (isAbort) {
          safeUpdate((s) => ({ ...s, status: "cancelled", errorMessage: null }));
          delete abortControllersRef.current[key];
          return null;
        }

        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : `Failed to generate ${kind === "RESUME_ADVICE" ? "resume advice" : "cover letter"}.`;

        safeUpdate((s) => ({ ...s, status: "error", errorMessage: message }));
        delete abortControllersRef.current[key];
        throw err;
      }
    },
    [runsByAppId]
  );

  return { runsByAppId, getRun, startRun, clearRun, cancelRun };
}