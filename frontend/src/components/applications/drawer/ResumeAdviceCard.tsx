"use client";

import { useEffect, useRef, useState } from "react";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { ResumeAdviceReport }  from "@/components/applications/drawer/ResumeAdviceReport";
import { ToolInfoPopover }     from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }           from "@/lib/tool-info";
import { Loader2, AlertTriangle } from "lucide-react";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import type { Application, AiArtifact, ResumeAdvicePayload } from "@/types/api";

// Accepted file types for resume override
const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  application:        Application;
  baseResumeExists:   boolean;
  canUseAi:           boolean;
  documentToolRuns:   DocumentToolRunsController;
  onCloseOthers?:     () => void;
  onRegisterClose?:   (fn: () => void) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:        () => void;
}

export function ResumeAdviceCard({
  application,
  baseResumeExists,
  canUseAi,
  documentToolRuns,
  onCloseOthers,
  onRegisterClose,
  onApplicationChanged,
  onRefreshMe,
}: Props) {
  // Latest persisted artifact for this application
  const [artifact,      setArtifact]      = useState<AiArtifact<ResumeAdvicePayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Local error (separate from background run error)
  const [error,       setError]       = useState<string | null>(null);
  const [isRerunMode, setIsRerunMode] = useState(false);

  // Report panel open/close
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Per-tool resume override — independent of the Fit card
  const [overrideFile, setOverrideFile] = useState<File | null>(null);
  const overrideInputRef                = useRef<HTMLInputElement>(null);

  // Prevent stale setState after unmount or application switch
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  // Register close handler — collapses the report panel when another panel opens
  useEffect(() => {
    onRegisterClose?.(() => setIsReportOpen(false));
  }, [onRegisterClose]);

  // Load latest artifact; reset UI when application changes
  useEffect(() => {
    let cancelled = false;
    setArtifact(null);
    setIsReportOpen(false);
    setIsRerunMode(false);
    setLoadingLatest(true);

    applicationsApi
      .listAiArtifacts(application.id, { kind: "RESUME_ADVICE" })
      .then((res) => {
        if (!cancelled) setArtifact((res?.[0] as AiArtifact<ResumeAdvicePayload>) ?? null);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoadingLatest(false); });

    return () => { cancelled = true; };
  }, [application.id]);

  // When a background run succeeds, reload the artifact so the card shows the new result
  const run = documentToolRuns.getRun(application.id, "RESUME_ADVICE");
  const prevRunStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevRunStatusRef.current !== "success" && run?.status === "success") {
      // Re-fetch the artifact — the run completed in the background
      applicationsApi
        .listAiArtifacts(application.id, { kind: "RESUME_ADVICE" })
        .then((res) => {
          if (mountedRef.current) {
            setArtifact((res?.[0] as AiArtifact<ResumeAdvicePayload>) ?? null);
            setIsRerunMode(false);
          }
        })
        .catch(() => { /* silent */ });
    }
    prevRunStatusRef.current = run?.status ?? null;
  }, [run?.status, application.id]);

  const hasJd       = Boolean(application.description?.trim());
  const resumeReady = overrideFile ? true : baseResumeExists;
  const isRunning   = run?.status === "running";
  const canRun      = hasJd && resumeReady && canUseAi && !isRunning;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setError(null);

    try {
      // Start the background run — survives drawer close
      await documentToolRuns.startRun({
        applicationId:      application.id,
        kind:               "RESUME_ADVICE",
        onApplicationChanged,
        onRefreshMe,
      });
    } catch (err) {
      // Error is stored in the run state; also surface locally
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err.message : "Failed to generate resume advice.");
      }
    }
  }

  return (
    <Card className="p-4">
      {/* ── Card header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-md font-medium">Resume Advice</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Evaluate and improve your resume for this specific role.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loadingLatest && <span className="text-xs text-muted-foreground">Loading…</span>}
          {/* ? button — explains what the tool does and what inputs it needs */}
          <ToolInfoPopover
            title={TOOL_INFO.RESUME_ADVICE.title}
            content={TOOL_INFO.RESUME_ADVICE.content}
            popoverContentClassName="w-80 p-4 text-sm space-y-1.5"
          />
        </div>
      </div>

      {/* ── In-flight progress ─────────────────────────────────────────── */}
      {isRunning && run ? (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="text-sm font-medium">{run.label}</span>
          </div>
          <div className="h-1.5 w-full rounded bg-muted">
            {/* Indeterminate progress — single-step tool */}
            <div className="h-1.5 rounded bg-primary w-1/2 animate-pulse" />
          </div>
          {/* <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            You can close this drawer — the run will continue in the background.
          </div> */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => documentToolRuns.cancelRun(application.id, "RESUME_ADVICE")}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Error from background run ─────────────────────────────── */}
          {(error || run?.status === "error") && (
            <div className="text-sm text-destructive">
              {error ?? run?.errorMessage ?? "Something went wrong."}
            </div>
          )}

          {/* ── Result-first view ──────────────────────────────────────── */}
          {artifact && !isRerunMode ? (
            <>
              {/* Summary — gives a quick sense of what the advice covers */}
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span className="text-foreground/80 font-medium">
                  A resume alignment report has been generated with resume tailoring advice based this role. 
                </span>
                
                <br/><br/>

                {artifact.payload.summary}

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsReportOpen(true);
                      onCloseOthers?.();
                    }}
                  >
                    See full report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setIsRerunMode(true);
                    }}
                  >
                    Re-evaluate
                  </Button>
                </div>
              </div>

              {/* ── Full report panel ─────────────────────────────────────────── */}
              <ResumeAdviceReport
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                artifact={artifact}
                jobLabel={jobLabel}
              />
            </>
          ) : (
            /* ── Generate / re-run mode ─────────────────────────────── */
            <>
              {/* Resume override */}
              <div className="flex items-center gap-2 mt-5">
                <div className="text-xs">
                  {overrideFile ? (
                    <button
                      type="button"
                      onClick={() => overrideInputRef.current?.click()}
                    >
                      <span className="text-muted-foreground">Resume: </span>
                      <span className="text-foreground hover:underline underline-offset-2">{overrideFile.name}</span>
                    </button>
                  ) : baseResumeExists ? (
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
                    <button
                      type="button"
                      onClick={() => overrideInputRef.current?.click()}
                    >
                      <span className="text-red-600 font-medium">A resume is needed to use this tool. </span>
                      <span className="text-muted-foreground underline underline-offset-2 hover:text-foreground">Click to upload one now</span>
                    </button>
                  )}
                </div>
                {overrideFile && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:font-semibold hover:text-red-600"
                    onClick={() => {
                      setOverrideFile(null);
                      if (overrideInputRef.current) overrideInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                )}
                <input
                  ref={overrideInputRef}
                  type="file"
                  accept={RESUME_ACCEPT}
                  className="hidden"
                  onChange={(e) => setOverrideFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button disabled={!canRun} onClick={handleGenerate} className={isRerunMode ? "" : "w-full"}>
                  Get resume advice
                </Button>
                {isRerunMode && (
                  <Button variant="outline" onClick={() => { setError(null); setIsRerunMode(false); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}