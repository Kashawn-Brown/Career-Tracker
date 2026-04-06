"use client";

import { useApplicationDocs } from "@/hooks/useApplicationDocs";

import { useEffect, useRef, useState } from "react";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { ResumeAdviceReport }  from "@/components/applications/drawer/ResumeAdviceReport";
import { ToolInfoPopover }     from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }           from "@/lib/tool-info";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolRunProgress } from "@/components/applications/drawer/ToolRunProgress";
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
  onDocumentsChanged?:   (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:           () => void;
  // Incremented by the drawer whenever a document is added, so the resume
  // picker re-fetches without requiring a full drawer close/reopen.
  docsReloadKey?: number;
}

export function ResumeAdviceCard({
  application,
  baseResumeExists,
  canUseAi,
  documentToolRuns,
  onCloseOthers,
  onRegisterClose,
  onDocumentsChanged,
  onApplicationChanged,
  onRefreshMe,
  docsReloadKey = 0,
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
  const [overrideFile,  setOverrideFile]  = useState<File | null>(null);
  const overrideInputRef                  = useRef<HTMLInputElement>(null);
  // User can pick an already-attached application doc instead of uploading again
  const [selectedDocId,  setSelectedDocId]  = useState<number | null>(null);
  // Controls visibility of the "pick from application" dropdown
  const [showDocPicker,  setShowDocPicker]  = useState(false);

  // Fetch resume-type docs already attached to this application.
  // Re-fetches whenever docsReloadKey changes (doc added in the drawer).
  const { resumeDocs } = useApplicationDocs(application.id, docsReloadKey);

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

    async function loadLatest() {
      // Resets inside the async function — avoids react-hooks/set-state-in-effect
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
    }

    void loadLatest();
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
  const resumeReady = overrideFile || selectedDocId ? true : baseResumeExists;
  const isRunning   = run?.status === "running";
  const canRun      = hasJd && resumeReady && canUseAi && !isRunning;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setError(null);

    try {
      // Start the background run — survives drawer close
      await documentToolRuns.startRun({
        applicationId:    application.id,
        kind:             "RESUME_ADVICE",
        overrideFile:     overrideFile ?? undefined,
        sourceDocumentId: overrideFile ? undefined : (selectedDocId ?? undefined),
        onDocumentsChanged,
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
        <ToolRunProgress
          steps={run.steps}
          activeIndex={run.activeIndex}
          onCancel={() => documentToolRuns.cancelRun(application.id, "RESUME_ADVICE")}
        />
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

              {/* ── Full report panel ─────────────────────────────────── */}
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
                      {"Pick from this application's documents"}
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