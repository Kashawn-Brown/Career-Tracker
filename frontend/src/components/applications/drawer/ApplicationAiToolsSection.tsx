"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applicationsApi } from "@/lib/api/applications";
import type { Application, AiArtifact, FitV1Payload } from "@/types/api";
import type { FitRunsController } from "@/hooks/useFitRuns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { FitReportDialog, type FitBand } from "@/components/applications/drawer/FitReportDialog";
import { ProAccessBanner } from "@/components/pro/ProAccessBanner";
import { RequestProDialog } from "@/components/pro/RequestProDialog";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

// Get the fit band based on the score
function getFitBand(score: number): FitBand {
  if (score >= 85) {
    return {
      label: "Strong fit",
      stripeClass: "border-l-green-500",
      badgeClass: "border-green-200 bg-green-50 text-green-700",
    };
  }
  if (score >= 70) {
    return {
      label: "Good fit",
      stripeClass: "border-l-emerald-500",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (score >= 50) {
    return {
      label: "Mixed fit",
      stripeClass: "border-l-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "Weak fit",
    stripeClass: "border-l-red-500",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    };
}

// Props for the ApplicationAiToolsSection component
type Props = {
  drawerOpen: boolean;
  application: Application;
  fitRuns: FitRunsController;

  baseResumeExists: boolean;
  baseResumeId: number | null;

  useOverride: boolean;
  overrideFile: File | null;
  onToggleOverride: (checked: boolean) => void;
  onOverrideFile: (file: File | null) => void;

  onDocumentsChanged?: (applicationId: string) => void;

  onRequestClosePreview?: () => void;

  onApplicationChanged?: (applicationId: string) => void;

  autoOpenLatestFit?: boolean;
  onAutoOpenLatestFitConsumed?: () => void;
};

export function ApplicationAiToolsSection({
  drawerOpen,
  application,
  fitRuns,
  baseResumeExists,
  baseResumeId,
  useOverride,
  overrideFile,
  onToggleOverride,
  onOverrideFile,
  onDocumentsChanged,
  onRequestClosePreview,
  onApplicationChanged,
  autoOpenLatestFit,
  onAutoOpenLatestFitConsumed,
}: Props) {
  // FIT artifact
  const [fitArtifact, setFitArtifact] = useState<AiArtifact<FitV1Payload> | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Details dialog state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRerunMode, setIsRerunMode] = useState(false);

  // Pro access state
  const { user, aiProRequest, refreshMe } = useAuth();
  const aiProEnabled = !!user?.aiProEnabled;
  const aiFreeUsesUsed = user?.aiFreeUsesUsed ?? 0;

  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  // Run state (lives outside the drawer)
  const run = fitRuns.getRun(application.id);
  const isRunning = run?.status === "running";

  // Prefer local errors, but fall back to background-run errors if the drawer was closed.
  const displayedError =
    errorMessage ?? (run?.status === "error" ? run.errorMessage ?? null : null);


  // Avoid setting state after drawer closes / component unmounts
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, [application.id]);

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    autoOpenedRef.current = false; // reset per-application
  }, [application.id]);

  const fitArtifactId = fitArtifact?.id ?? null;

  useEffect(() => {
    if (!autoOpenLatestFit) return;
    if (!fitArtifactId) return;
    if (isRerunMode) return;
    if (autoOpenedRef.current) return;

    autoOpenedRef.current = true;
    setIsDetailsOpen(true);
    onRequestClosePreview?.();
    onAutoOpenLatestFitConsumed?.();
  }, [
    autoOpenLatestFit,
    fitArtifactId,
    isRerunMode,
    onRequestClosePreview,
    onAutoOpenLatestFitConsumed,
  ]);

  // Load the latest fit artifact
  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      setIsLoadingLatest(true);

      // Avoid flashing a previous application's result while loading the new one.
      setFitArtifact(null);
      setIsDetailsOpen(false);
      setIsRerunMode(false);

      try {
        setErrorMessage(null);

        const res = await applicationsApi.listAiArtifacts(application.id, { kind: "FIT_V1" });
        const latest = res?.[0] ?? null;

        if (!cancelled) setFitArtifact(latest as AiArtifact<FitV1Payload>);
      } catch (err) {
        if (!cancelled) {
          // don't hard-fail the whole section; just show nothing + a small error
          if (err instanceof ApiError) setErrorMessage(err.message);
          else setErrorMessage("Failed to load latest fit result.");
        }
      } finally {
        if (!cancelled) setIsLoadingLatest(false);
      }
    }

    loadLatest();

    return () => {
      cancelled = true;
    };
  }, [application.id]);

  // Reset the UI state when the drawer is closed.
  useEffect(() => {
    if (!drawerOpen) {
      setIsRerunMode(false);
      setIsDetailsOpen(false);
      setErrorMessage(null);
    }
  }, [drawerOpen]);

  // Whether the job description is ready to be used
  const hasJd = useMemo(() => {
    const jd = application.description?.trim();
    return Boolean(jd && jd.length > 0);
  }, [application.description]);

  // Whether the resume is ready to be used
  const resumeReady = useOverride ? Boolean(overrideFile) : baseResumeExists;
  const isReady = hasJd && resumeReady;

  // Runs the FIT tool (through the page-level run manager)
  async function runFit() {
    if (!hasJd) {
      setErrorMessage("Missing job description on this application.");
      return;
    }

    if (useOverride && !overrideFile) {
      setErrorMessage("Select a file to use for this run (or turn off override).");
      return;
    }

    if (!useOverride && !baseResumeExists) {
      setErrorMessage("Upload a Base Resume in Profile (or use an override file).");
      return;
    }

    setErrorMessage(null);

    // Drawer-run should be non-interrupting: don’t auto-open the report dialog.
    setIsDetailsOpen(false);

    try {
      const created = await fitRuns.startFitRun({
        applicationId: application.id,
        overrideFile: useOverride ? overrideFile : null,
        onDocumentsChanged,
        onApplicationChanged,
        onRefreshMe: () => void refreshMe(),
      });

      // If the drawer stayed open, update the local summary immediately.
      if (created && mountedRef.current) {
        setFitArtifact(created as AiArtifact<FitV1Payload>);
      }

      if (mountedRef.current) {
        setIsRerunMode(false);

        // Keep behavior predictable after a successful run.
        onToggleOverride(false);
        onOverrideFile(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (err instanceof ApiError) setErrorMessage(err.message);
        else setErrorMessage("Failed to generate fit result.");
      }
    }
  }

  const jobLabel = [application.position, application.company].filter(Boolean).join(" @ ");

  // Drawer in-flight UI (mirrors CreateApplicationFromJdForm's progress language)
  const steps = run?.steps ?? [];
  const activeIndex = run?.activeIndex ?? 0;
  const activeLabel = steps?.[activeIndex]?.label ?? "Working...";

  const progressWidth =
    steps.length > 0
      ? `${Math.round(((activeIndex + 1) / steps.length) * 100)}%`
      : "30%";

  return (
    <Card className="p-4 space-y-3">
      {/* Error message */}
      {displayedError ? (
        <div className="relative rounded-md border px-3 py-2 pr-10 text-sm text-destructive">
          {displayedError}
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);

              // If this error came from a background run, clear it so the UI isn't stuck.
              if (run?.status === "error") {
                fitRuns.clearRun(application.id);
              }
            }}
            className="absolute right-2 top-1 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss message"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}


      {/* Pro access banner */}
      <ProAccessBanner
        aiProEnabled={aiProEnabled}
        aiFreeUsesUsed={aiFreeUsesUsed}
        aiProRequest={aiProRequest}
        onRequestPro={() => setIsProDialogOpen(true)}
      />

      {/* Request pro dialog */}
      <RequestProDialog
        open={isProDialogOpen}
        onOpenChange={setIsProDialogOpen}
        onRequested={() => refreshMe()}
      />

      {/* Job compatibility check section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">AI Job Compatibility Check</div>
          <div className="text-xs text-muted-foreground">
            Requires Job Description + Resume (Base Resume by default).
          </div>
        </div>
      </div>

      {/* In-flight state: lock this section + show steps/progress */}
      {isRunning && run ? (
        <div className="rounded-md border p-3">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-1 h-5 w-5 animate-spin" />
            <div className="flex-1">
              <div className="text-base font-medium">{activeLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Step {Math.min(activeIndex + 1, steps.length)} of {steps.length}
              </div>
            </div>
          </div>

          {/* Progress bar (same markup style as CreateApplicationFromJdForm) */}
          <div className="mt-4 h-2 w-full rounded bg-muted">
            <div
              className="h-2 rounded bg-primary transition-all"
              style={{ width: progressWidth }}
            />
          </div>

          {/* Steps list (same icon language as CreateApplicationFromJdForm) */}
          {steps.length > 1 ? (
            <div className="mt-4 space-y-2 text-sm">
              {steps.map((s, idx) => {
                const isDone = idx < activeIndex;
                const isActive = idx === activeIndex;

                return (
                  <div key={s.key} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 opacity-60" />
                    )}

                    <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* Summary-first view: once a fit exists, hide inputs until user chooses to rerun */}
          {isLoadingLatest && !fitArtifact && !isRerunMode ? (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Estimated Match</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </div>
              </div>

              <div className="space-y-3 animate-pulse">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-24 rounded bg-muted" />
                    <div className="h-5 w-20 rounded-full bg-muted" />
                  </div>
                  <div className="h-4 w-28 rounded bg-muted" />
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-5/6 rounded bg-muted" />
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <div className="h-8 w-24 rounded bg-muted" />
                  <div className="h-8 w-44 rounded bg-muted" />
                </div>
              </div>
            </div>
          ) : fitArtifact && !isRerunMode ? (
            (() => {
              const p = fitArtifact.payload;
              const band = getFitBand(p.score);

              const usedDocLabel =
                baseResumeId && fitArtifact.sourceDocumentId === baseResumeId
                  ? "Base Resume"
                  : fitArtifact.sourceDocumentName
                  ? fitArtifact.sourceDocumentName
                  : fitArtifact.sourceDocumentId
                  ? `Doc #${fitArtifact.sourceDocumentId}`
                  : "Base Resume";

              return (
                <div className={cn("rounded-md border p-3 space-y-3 border-l-4", band.stripeClass)}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Estimated Match</div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-semibold">
                        {p.score}
                        <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                      </div>

                      <div
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          band.badgeClass
                        )}
                      >
                        {band.label}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Confidence: <span className="text-foreground">{p.confidence}</span>
                    </div>
                  </div>

                  {p.strengths?.[0] ? (
                    <div>
                      <div className="text-sm font-medium mb-1">Strengths summary</div>
                      <div className="rounded-md border bg-muted/10 p-3">
                        <div className="text-sm text-muted-foreground">{p.strengths[0]}</div>
                      </div>
                    </div>
                  ) : null}

                  {p.gaps?.[0] ? (
                    <div>
                      <div className="text-sm font-medium mb-1">Potential gaps summary</div>
                      <div className="rounded-md border bg-muted/10 p-3">
                        <div className="text-sm text-muted-foreground">{p.gaps[0]}</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDetailsOpen(true);
                        onRequestClosePreview?.();
                      }}
                    >
                      See more
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrorMessage(null);
                        setIsRerunMode(true);
                      }}
                    >
                      Re-run compatibility check
                    </Button>
                  </div>

                  <FitReportDialog
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
            <>
              {/* Readiness */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>Job description</span>
                  <span className={hasJd ? "text-foreground" : "text-destructive"}>
                    {hasJd ? "Ready" : "Missing"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Base Resume</span>
                  <span className={baseResumeExists ? "text-foreground" : "text-muted-foreground"}>
                    {baseResumeExists ? "Saved" : "Not uploaded"}
                  </span>
                </div>
              </div>

              {/* Override selection for the full history document */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="ai-use-override"
                    type="checkbox"
                    checked={useOverride}
                    onChange={(e) => {
                      onToggleOverride(e.target.checked);
                      if (!e.target.checked) onOverrideFile(null);
                    }}
                  />
                  <label htmlFor="ai-use-override" className="text-sm">
                    Use a different file to check compatibility
                  </label>
                </div>

                {useOverride ? (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={(e) => onOverrideFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Default: Base Resume (recommended).
                  </div>
                )}
              </div>

              {/* Run button */}
              <div className="pt-2 border-t space-y-2">
                <Button className="w-full" disabled={!isReady || isRunning} onClick={runFit}>
                  {isRunning ? "Running..." : "Run Compatibility"}
                </Button>

                {/* Replace-mode rerun: show Cancel ONLY when user chose rerun */}
                {isRerunMode ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isRunning}
                    onClick={() => {
                      setErrorMessage(null);
                      setIsRerunMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}

                {isLoadingLatest ? (
                  <div className="text-xs text-muted-foreground">Loading latest result...</div>
                ) : !fitArtifact ? (
                  <div className="text-xs text-muted-foreground">
                    No fit result yet. Run the tool to generate one.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    A previous result exists. Running again will generate a new latest result.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
