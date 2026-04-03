"use client";

import { useApplicationDocs } from "@/hooks/useApplicationDocs";

import { ToolInfoPopover } from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }       from "@/lib/tool-info";

import { useEffect, useMemo, useRef, useState } from "react";
import { applicationsApi } from "@/lib/api/applications";
import type { Application, AiArtifact, FitV1Payload } from "@/types/api";
import type { FitRunsController } from "@/hooks/useFitRuns";
import { Button }     from "@/components/ui/button";
import { Card }       from "@/components/ui/card";
import { ApiError }   from "@/lib/api/client";
import { cn }         from "@/lib/utils";
import { FitReport }  from "@/components/applications/drawer/FitReport";
import { getFitBand } from "@/lib/fit/presentation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolRunProgress } from "@/components/applications/drawer/ToolRunProgress";

// Accepted file types for the per-tool resume override
const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  drawerOpen:   boolean;
  application:  Application;
  fitRuns:      FitRunsController;

  baseResumeExists: boolean;
  baseResumeId:     number | null;

  canUseAi:     boolean;
  onCloseOthers?:   () => void;
  onRegisterClose?: (fn: () => void) => void;

  onDocumentsChanged?:  (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:          () => void;

  autoOpenLatestFit?:          boolean;
  onAutoOpenLatestFitConsumed?: () => void;
  // Incremented by the drawer whenever a document is added, so the resume
  // picker re-fetches without requiring a full drawer close/reopen.
  docsReloadKey?: number;
}

export function CompatibilityCheckCard({
  drawerOpen,
  application,
  fitRuns,
  baseResumeExists,
  baseResumeId,
  canUseAi,
  onCloseOthers,
  onRegisterClose,
  onDocumentsChanged,
  onApplicationChanged,
  onRefreshMe,
  autoOpenLatestFit,
  onAutoOpenLatestFitConsumed,
  docsReloadKey = 0,
}: Props) {
  // Fit artifact from the last completed run
  const [fitArtifact,    setFitArtifact]    = useState<AiArtifact<FitV1Payload> | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);

  // Local error message (overrides background-run errors while drawer is open)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controls the FitReport side panel and re-run mode
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRerunMode,   setIsRerunMode]   = useState(false);

  // Per-tool resume override — uniform underline-button style matching other cards
  const [overrideFile,  setOverrideFile]  = useState<File | null>(null);
  const overrideInputRef                  = useRef<HTMLInputElement>(null);
  // User can pick an already-attached application doc instead of uploading again
  const [selectedDocId,  setSelectedDocId]  = useState<number | null>(null);
  // Controls visibility of the "pick from application" dropdown
  const [showDocPicker,  setShowDocPicker]  = useState(false);

  // Fetch resume-type docs already attached to this application.
  // Re-fetches whenever docsReloadKey changes (doc added in the drawer).
  const { resumeDocs } = useApplicationDocs(application.id, docsReloadKey);

  // Guards against stale setState after unmount or application switch
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  // Auto-open the latest fit report after a background fit run completes
  const autoOpenedRef  = useRef(false);
  useEffect(() => { autoOpenedRef.current = false; }, [application.id]);

  const fitArtifactId = fitArtifact?.id ?? null;
  useEffect(() => {
    if (!autoOpenLatestFit) return;
    if (!fitArtifactId) return;
    if (isRerunMode) return;
    if (autoOpenedRef.current) return;

    autoOpenedRef.current = true;
    setIsDetailsOpen(true);
    onCloseOthers?.();
    onAutoOpenLatestFitConsumed?.();
  }, [autoOpenLatestFit, fitArtifactId, isRerunMode, onCloseOthers, onAutoOpenLatestFitConsumed]);

  // Register close handler so FitReport collapses when another panel opens
  useEffect(() => {
    onRegisterClose?.(() => setIsDetailsOpen(false));
  }, [onRegisterClose]);

  // Load the latest FIT_V1 artifact when the application changes
  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      setIsLoadingLatest(true);
      // Clear stale result immediately to avoid flashing the wrong application's data
      setFitArtifact(null);
      setIsDetailsOpen(false);
      setIsRerunMode(false);

      try {
        setErrorMessage(null);
        const res    = await applicationsApi.listAiArtifacts(application.id, { kind: "FIT_V1" });
        const latest = res?.[0] ?? null;
        if (!cancelled) setFitArtifact(latest as AiArtifact<FitV1Payload>);
      } catch (err) {
        if (!cancelled) {
          // Non-fatal: show a small error but don't break the whole section
          setErrorMessage(err instanceof ApiError ? err.message : "Failed to load latest fit result.");
        }
      } finally {
        if (!cancelled) setIsLoadingLatest(false);
      }
    }

    loadLatest();
    return () => { cancelled = true; };
  }, [application.id]);

  // Reset transient UI state when the drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      setIsRerunMode(false);
      setIsDetailsOpen(false);
      setErrorMessage(null);
    }
  }, [drawerOpen]);

  const hasJd = useMemo(() => {
    return Boolean(application.description?.trim());
  }, [application.description]);

  // Resume is ready when an override file is staged OR a doc is picked OR base resume is saved
  const resumeReady = overrideFile || selectedDocId ? true : baseResumeExists;
  const isReady     = hasJd && resumeReady && canUseAi;

  // Current background run for this application (if any)
  const run       = fitRuns.getRun(application.id);
  const isRunning = run?.status === "running";

  // Prefer local error, fall back to background-run error (e.g. if drawer was closed mid-run)
  const displayedError =
    errorMessage ?? (run?.status === "error" ? run.errorMessage ?? null : null);

  // Progress bar helpers
  // Steps and active index — passed directly to ToolRunProgress
  const steps       = run?.steps ?? [];
  const activeIndex = run?.activeIndex ?? 0;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" @ ");

  async function runFit() {
    // Validate before sending to the run manager
    if (!hasJd) {
      setErrorMessage("This application is missing a job description.");
      return;
    }
    if (!resumeReady) {
      setErrorMessage("Upload a base resume in Profile, or select an override file.");
      return;
    }

    setErrorMessage(null);
    setIsDetailsOpen(false); // don't auto-open report — non-interrupting run

    try {
      const created = await fitRuns.startFitRun({
        applicationId: application.id,
        // When a doc is pre-selected, pass its ID and skip the upload step.
        // When a file is staged, upload it (useFitRuns handles that internally).
        overrideFile:     selectedDocId ? null : (overrideFile ?? null),
        sourceDocumentId: selectedDocId ?? undefined,
        onDocumentsChanged,
        onApplicationChanged,
        onRefreshMe,
      });

      // Guard against the user switching applications while the run was in flight
      if (created && mountedRef.current && created.jobApplicationId === application.id) {
        setFitArtifact(created as AiArtifact<FitV1Payload>);
      }

      if (mountedRef.current) {
        setIsRerunMode(false);
        // Clear the override after a successful run
        setOverrideFile(null);
        setSelectedDocId(null);
        if (overrideInputRef.current) overrideInputRef.current.value = "";
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to generate fit result.");
      }
    }
  }

  return (
    <Card className="p-4">
      {/* ── Card header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-md font-medium">Compatibility Check</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            See how well you line up with this role as a candidate.
          </div>
        </div>
        {/* ? button — explains what the tool does and what inputs it needs */}
        <ToolInfoPopover
          title={TOOL_INFO.COMPATIBILITY_CHECK.title}
          content={TOOL_INFO.COMPATIBILITY_CHECK.content}
          popoverContentClassName="w-80 p-4 text-sm space-y-1.5"
        />
      </div>

      {/* ── Error message ─────────────────────────────────────────────── */}
      {displayedError && (
        <div className="relative rounded-md border px-3 py-2 pr-8 text-sm text-destructive">
          {displayedError}
          <button
            type="button"
            className="absolute right-2 top-1 rounded px-1.5 py-0.5 opacity-70 hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss"
            onClick={() => {
              setErrorMessage(null);
              // Also clear a background-run error so the UI isn't stuck
              if (run?.status === "error") fitRuns.clearRun(application.id);
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── In-flight progress (shown while a run is active) ─────────── */}
      {isRunning && run ? (
        <ToolRunProgress
          steps={steps}
          activeIndex={activeIndex}
          onCancel={() => fitRuns.cancelRun(application.id)}
        />
      ) : (
        <>
          {/* ── Loading skeleton (while fetching latest artifact) ─────── */}
          {isLoadingLatest && !fitArtifact && !isRerunMode ? (
            <div className="rounded-md border p-3 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
            </div>
          ) : fitArtifact && !isRerunMode ? (
            /* ── Result summary (compact) ───────────────────────────── */
            (() => {
              const p    = fitArtifact.payload;
              const band = getFitBand(p.score);

              const usedDocLabel =
                baseResumeId && fitArtifact.sourceDocumentId === baseResumeId
                  ? "Base Resume"
                  : fitArtifact.sourceDocumentName ?? (
                      fitArtifact.sourceDocumentId ? `Doc #${fitArtifact.sourceDocumentId}` : "Base Resume"
                    );

              return (
                <div className={cn("rounded-md border p-3 space-y-3 border-l-4", band.stripeClass)}>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-semibold">
                        {p.score}
                        <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                    <div className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        band.badgeClass
                      )}>
                        {band.label}
                      </div>
                    </div>

                  </div>

                  {p.fitSummary && (
                    <div>
                      <div className="text-xs font-medium mb-1 uppercase tracking-wide">Summary</div>
                      <div className="text-sm text-muted-foreground">{p.fitSummary}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 text-muted-foreground mb-0">
                    <Button size="sm"
                      onClick={() => { setIsDetailsOpen(true); onCloseOthers?.(); }}>
                      See full report
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => { setErrorMessage(null); setIsRerunMode(true); }}>
                      Re-run
                    </Button>
                  </div>

                  <FitReport
                    open={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    artifact={fitArtifact}
                    band={band}
                    usedDocLabel={usedDocLabel}
                    jobLabel={jobLabel}
                  />
                </div>
              );
            })()
          ) : (
            /* ── Run mode (no result yet, or user hit Re-run) ─────────── */
            <>
              {/* ── Resume source ─────────────────────────────────────────
                   Upload new file, OR pick a doc already attached, OR use base resume */}
              <div className="mt-5 space-y-2">
                <div className="text-xs mb-0">
                  {overrideFile ? (
                    <button type="button" onClick={() => overrideInputRef.current?.click()}>
                      <span className="text-muted-foreground">Resume: </span>
                      <span className="text-foreground hover:underline underline-offset-2">{overrideFile.name}</span>
                    </button>
                  ) : selectedDocId ? null : baseResumeExists ? (
                    <>
                      <div className="text-muted-foreground">
                        <span className="text-foreground/80">Using: </span>
                        <span className="font-medium text-foreground/80">Base resume</span>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground underline underline-offset-2 hover:text-foreground mt-1"
                        onClick={() => overrideInputRef.current?.click()}
                      >
                        Upload a different resume to use
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => overrideInputRef.current?.click()}>
                      <span className="text-red-600 font-medium">A resume is needed. </span>
                      <span className="text-muted-foreground underline underline-offset-2 hover:text-foreground">Click to upload one now</span>
                    </button>
                  )}
                </div>

                {/* Clear uploaded file */}
                {overrideFile && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:font-medium hover:text-red-600 mb-0"
                    onClick={() => { setOverrideFile(null); if (overrideInputRef.current) overrideInputRef.current.value = ""; }}
                  >
                    ✕ Remove
                  </button>
                )}

                {/* Picked existing doc — show name + clear */}
                {selectedDocId && !overrideFile && (
                  <div className="space-y-1 text-xs">
                    <div className="text-muted-foreground">
                      <span className="text-foreground/80">Resume: </span>
                      <span className="text-foreground">{resumeDocs.find(d => d.id === selectedDocId)?.originalName}</span>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:font-medium hover:text-red-600"
                      onClick={() => setSelectedDocId(null)}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                {/* Chevron toggle — only shown when there are attached docs and nothing is selected */}
                {resumeDocs.length > 0 && !overrideFile && !selectedDocId && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className={!showDocPicker ? "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" : "flex items-center gap-1 text-xs text-foreground"}
                      onClick={() => setShowDocPicker((v) => !v)}
                    >
                      {showDocPicker
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />}
                      Pick from this application's documents
                    </button>

                    {/* Collapsed list — only rendered when expanded */}
                    {showDocPicker && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {resumeDocs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className="block text-xs text-muted-foreground truncate max-w-full"
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setOverrideFile(null);
                              setShowDocPicker(false);
                            }}
                          >
                            - <span className="underline underline-offset-2 hover:text-foreground">{doc.originalName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={overrideInputRef}
                  type="file"
                  accept={RESUME_ACCEPT}
                  className="hidden"
                  onChange={(e) => { setSelectedDocId(null); setOverrideFile(e.target.files?.[0] ?? null); }}
                />
              </div>

              <div className="pt-2 border-t space-y-2">
                <Button className="w-full" disabled={!isReady || isRunning} onClick={runFit}>
                  {isRunning ? "Running…" : "Run Compatibility"}
                </Button>

                {/* Cancel re-run mode */}
                {isRerunMode && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isRunning}
                    onClick={() => { setErrorMessage(null); setIsRerunMode(false); }}
                  >
                    Cancel
                  </Button>
                )}

                <div className="text-xs text-muted-foreground">
                  {isLoadingLatest
                    ? "Loading latest result…"
                    : fitArtifact
                    ? "A previous result exists — running again replaces it."
                    : null}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}