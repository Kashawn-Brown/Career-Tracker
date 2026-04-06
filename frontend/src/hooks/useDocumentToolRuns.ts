"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError }                from "@/lib/api/client";
import { applicationsApi }         from "@/lib/api/applications";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { documentsApi }            from "@/lib/api/documents";
import type { AiArtifact } from "@/types/api";

export type DocumentToolKind      = "RESUME_ADVICE" | "COVER_LETTER";
export type DocumentToolRunStatus = "idle" | "running" | "success" | "error" | "cancelled";

// A single step shown in the progress UI — same shape as FitRunStep
export type DocumentToolRunStep = {
  key:   string;
  label: string;
};

export type DocumentToolRunState = {
  applicationId: string;
  kind:          DocumentToolKind;
  status:        DocumentToolRunStatus;
  // Steps and active index — mirrors FitRunState so ToolRunProgress can consume both
  steps:        DocumentToolRunStep[];
  activeIndex:  number;
  startedAt:    number;
  errorMessage?: string | null;
};

export type StartDocumentToolRunArgs = {
  applicationId: string;
  kind:          DocumentToolKind;

  // Optional override resume file — uploaded as CAREER_HISTORY, attached to application,
  // cleaned up on cancel (mirrors useFitRuns override behaviour exactly).
  overrideFile?: File | null;

  // Alternative to uploading: pick a doc already attached to the application
  sourceDocumentId?: number;

  templateText?:               string;   // cover letter: per-run template override
  skipBaseCoverLetterTemplate?: boolean; // cover letter: skip stored base template

  onDocumentsChanged?:   (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe?:          () => void;
};

export type DocumentToolRunsController = {
  runsByAppId: Record<string, DocumentToolRunState>;
  getRun:      (applicationId: string, kind: DocumentToolKind) => DocumentToolRunState | null;
  startRun:    (args: StartDocumentToolRunArgs) => Promise<AiArtifact | null>;
  clearRun:    (applicationId: string, kind: DocumentToolKind) => void;
  cancelRun:   (applicationId: string, kind: DocumentToolKind) => void;
};

// Composite key — prevents Resume Advice and Cover Letter runs for the same app colliding
function runKey(applicationId: string, kind: DocumentToolKind) {
  return `${applicationId}::${kind}`;
}

/**
 * useDocumentToolRuns — manages background runs for Resume Advice and Cover Letter.
 *
 * Fully mirrors useFitRuns:
 *   - Survives drawer close (page-level state)
 *   - Optional override file upload as CAREER_HISTORY, attached to the application
 *   - Upload is cleaned up (deleted) on cancel or error — same as useFitRuns
 *   - AbortController-based cancellation
 *   - Steps + activeIndex on run state — same shape as FitRunState so the shared
 *     ToolRunProgress component can render both without branching
 */
export function useDocumentToolRuns(): DocumentToolRunsController {
  const [runsByAppId, setRunsByAppId] = useState<Record<string, DocumentToolRunState>>({});

  // AbortController per run key
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  // Tracks uploaded override doc IDs so they can be deleted on cancel/error
  const uploadedOverrideDocIdRef = useRef<Record<string, number>>({});

  // Keeps the onDocumentsChanged callback so cancel can refresh the docs list
  const onDocumentsChangedRef = useRef<Record<string, ((id: string) => void) | undefined>>({});

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

  // Deletes the override doc from GCS + DB, then refreshes the docs UI.
  // Called on cancel and on error — mirrors cleanupOverrideDoc in useFitRuns.
  async function cleanupOverrideDoc(key: string, applicationId: string) {
    const docId = uploadedOverrideDocIdRef.current[key];
    if (!docId) return;

    // Clear tracking first to prevent double-delete
    delete uploadedOverrideDocIdRef.current[key];

    try {
      await documentsApi.deleteById(docId);
      onDocumentsChangedRef.current[key]?.(applicationId);
    } catch (err) {
      console.warn("Failed to cleanup override doc after cancel:", err);
    }
  }

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

    // Best-effort cleanup of any uploaded override
    void cleanupOverrideDoc(key, applicationId);
  }, []);

  const startRun = useCallback(
    async (args: StartDocumentToolRunArgs): Promise<AiArtifact | null> => {
      const {
        applicationId,
        kind,
        overrideFile,
        sourceDocumentId: passedSourceDocumentId,
        templateText,
        skipBaseCoverLetterTemplate,
        onDocumentsChanged,
        onApplicationChanged,
        onRefreshMe,
      } = args;

      const key = runKey(applicationId, kind);

      // Prevent double-start
      if (runsByAppId[key]?.status === "running") return null;

      onDocumentsChangedRef.current[key] = onDocumentsChanged;

      // Build the steps array for this run.
      // Upload step only appears when a new file is being sent — picking an
      // existing doc by ID skips it, matching useFitRuns behaviour exactly.
      const steps: DocumentToolRunStep[] = [];

      if (overrideFile) {
        steps.push({
          key:   "UPLOAD_RESUME",
          label: "Uploading resume…",
        });
      }

      steps.push({
        key:   "GENERATE",
        label: kind === "RESUME_ADVICE" ? "Generating resume advice…" : "Generating cover letter…",
      });

      const controller = new AbortController();
      abortControllersRef.current[key] = controller;

      setRunsByAppId((prev) => ({
        ...prev,
        [key]: {
          applicationId,
          kind,
          status:       "running",
          steps,
          activeIndex:  0,
          startedAt:    Date.now(),
          errorMessage: null,
        },
      }));

      const safeUpdate = (updater: (s: DocumentToolRunState) => DocumentToolRunState) => {
        setRunsByAppId((prev) => {
          const current = prev[key];
          if (!current) return prev;
          return { ...prev, [key]: updater(current) };
        });
      };

      // Index of the generate step — 1 if we uploaded first, 0 otherwise
      const generateStepIndex = overrideFile ? 1 : 0;

      let resolvedSourceDocumentId = passedSourceDocumentId;

      try {
        // Step 1 (optional): upload override resume → attach to application as CAREER_HISTORY
        if (overrideFile) {
          const uploadRes = await applicationDocumentsApi.upload(
            { applicationId, kind: "CAREER_HISTORY", file: overrideFile },
            { signal: controller.signal }
          );

          const docId = Number(uploadRes.document.id);
          if (!Number.isFinite(docId)) throw new Error("Override upload returned an invalid document id.");

          // Track so we can clean up on cancel/error
          uploadedOverrideDocIdRef.current[key] = docId;
          resolvedSourceDocumentId = docId;

          // Refresh the application's document list in the UI
          onDocumentsChanged?.(applicationId);

          // Advance to the generate step
          safeUpdate((s) => ({ ...s, activeIndex: generateStepIndex }));
        }

        // Step 2: generate the artifact
        const artifact = await applicationsApi.generateAiArtifact(
          applicationId,
          {
            kind,
            templateText,
            sourceDocumentId:            resolvedSourceDocumentId,
            skipBaseCoverLetterTemplate,
          },
          { signal: controller.signal }
        );

        safeUpdate((s) => ({ ...s, status: "success", errorMessage: null }));

        // Non-blocking post-success refreshes
        try { onRefreshMe?.(); }                        catch { /* non-blocking */ }
        try { onApplicationChanged?.(applicationId); }  catch { /* non-blocking */ }

        // Clean up refs (doc stays — it was successfully used)
        delete abortControllersRef.current[key];
        delete onDocumentsChangedRef.current[key];
        delete uploadedOverrideDocIdRef.current[key]; // only clears tracking, NOT the doc

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
          await cleanupOverrideDoc(key, applicationId);
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
        delete onDocumentsChangedRef.current[key];
        // Delete the uploaded doc on error — it's an orphan if generation failed
        await cleanupOverrideDoc(key, applicationId);

        throw err;
      }
    },
    [runsByAppId]
  );

  return { runsByAppId, getRun, startRun, clearRun, cancelRun };
}