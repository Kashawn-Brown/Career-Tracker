"use client";

import { useApplicationDocs } from "@/hooks/useApplicationDocs";
import { useEffect, useRef, useState } from "react";
import { CreditCostNote, BlockedRunButton } from "@/components/tools/ToolEntitlementGate";
import { Button }                from "@/components/ui/button";
import { Card }                  from "@/components/ui/card";
import { ApiError }              from "@/lib/api/client";
import { applicationsApi }       from "@/lib/api/applications";
import { InterviewPrepReport }   from "@/components/applications/drawer/InterviewPrepReport";
import { ToolInfoPopover }       from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }             from "@/lib/tool-info";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolRunProgress }       from "@/components/applications/drawer/ToolRunProgress";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import type { Application, AiArtifact, InterviewPrepPayload } from "@/types/api";

const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  application:        Application;
  baseResumeExists:   boolean;
  canUseAi:           boolean;
  isBlocked?:   boolean;
  plan?:        string;
  creditCost?:  number;
  documentToolRuns:   DocumentToolRunsController;
  onCloseOthers?:     () => void;
  onRegisterClose?:   (fn: () => void) => void;
  onDocumentsChanged?:   (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:           () => void;
  docsReloadKey?: number;
}

/**
 * InterviewPrepCard — drawer card for targeted interview prep.
 *
 * JD is required (same as all targeted tools). Resume is optional:
 *   - With a resume: richer output including background-defense and challenge questions
 *   - Without: JD-only output (role topics, role questions, interviewer questions)
 *
 * The card clearly signals which mode will be used so the candidate understands
 * what basis the prep was generated from.
 */
export function InterviewPrepCard({
  application,
  baseResumeExists,
  canUseAi,
  isBlocked  = false,
  plan       = "REGULAR",
  creditCost = 2,
  documentToolRuns,
  onCloseOthers,
  onRegisterClose,
  onDocumentsChanged,
  onApplicationChanged,
  onRefreshMe,
  docsReloadKey = 0,
}: Props) {
  const [artifact,      setArtifact]      = useState<AiArtifact<InterviewPrepPayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [isRerunMode,   setIsRerunMode]   = useState(false);
  const [isReportOpen,  setIsReportOpen]  = useState(false);

  // Resume override — optional for this tool
  const [overrideFile,    setOverrideFile]    = useState<File | null>(null);
  const [selectedDocId,   setSelectedDocId]   = useState<number | null>(null);
  const [showDocPicker,   setShowDocPicker]   = useState(false);
  const overrideInputRef                      = useRef<HTMLInputElement>(null);

  // Fetch resume-type docs already attached to this application
  const { resumeDocs } = useApplicationDocs(application.id, docsReloadKey);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  // Register close handler for mutual-close panel pattern
  useEffect(() => {
    onRegisterClose?.(() => setIsReportOpen(false));
  }, [onRegisterClose]);

  // Load latest artifact on application change
  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      setArtifact(null);
      setIsReportOpen(false);
      setIsRerunMode(false);
      setLoadingLatest(true);

      applicationsApi
        .listAiArtifacts(application.id, { kind: "INTERVIEW_PREP" })
        .then((res) => {
          if (!cancelled) setArtifact((res?.[0] as AiArtifact<InterviewPrepPayload>) ?? null);
        })
        .catch(() => { /* silent */ })
        .finally(() => { if (!cancelled) setLoadingLatest(false); });
    }

    void loadLatest();
    return () => { cancelled = true; };
  }, [application.id]);

  // Reload artifact when background run completes
  const run = documentToolRuns.getRun(application.id, "INTERVIEW_PREP");
  const prevRunStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevRunStatusRef.current !== "success" && run?.status === "success") {
      applicationsApi
        .listAiArtifacts(application.id, { kind: "INTERVIEW_PREP" })
        .then((res) => {
          if (mountedRef.current) {
            setArtifact((res?.[0] as AiArtifact<InterviewPrepPayload>) ?? null);
            setIsRerunMode(false);
          }
        })
        .catch(() => { /* silent */ });
    }
    prevRunStatusRef.current = run?.status ?? null;
  }, [run?.status, application.id]);

  const hasJd     = Boolean(application.description?.trim());
  const isRunning = run?.status === "running";
  const canRun    = hasJd && canUseAi && !isRunning;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setError(null);

    try {
      await documentToolRuns.startRun({
        applicationId:    application.id,
        kind:             "INTERVIEW_PREP",
        overrideFile:     overrideFile ?? undefined,
        sourceDocumentId: overrideFile ? undefined : (selectedDocId ?? undefined),
        onDocumentsChanged,
        onApplicationChanged,
        onRefreshMe,
      });
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err.message : "Failed to generate interview prep.");
      }
    }
  }

  return (
    <Card className="p-4">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-md font-medium">Interview Prep</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Generate a personalised prep pack for this specific role.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loadingLatest && <span className="text-xs text-muted-foreground">Loading…</span>}
          <ToolInfoPopover
            title={TOOL_INFO.INTERVIEW_PREP.title}
            content={TOOL_INFO.INTERVIEW_PREP.content}
            popoverContentClassName="w-80 p-4 text-sm space-y-1.5"
          />
        </div>
      </div>

      {/* ── In-flight progress ──────────────────────────────────────────── */}
      {isBlocked && !run ? (
        <p className="mt-3 text-xs text-muted-foreground border border-destructive/20 rounded-md bg-destructive/5 px-3 py-2">
          Monthly credit limit reached — this tool is unavailable until your credits reset.
        </p>
      ) : isRunning && run ? (
        <ToolRunProgress
          steps={run.steps}
          activeIndex={run.activeIndex}
          onCancel={() => documentToolRuns.cancelRun(application.id, "INTERVIEW_PREP")}
        />
      ) : (
        <>
          {/* ── Error ──────────────────────────────────────────────────── */}
          {(error || run?.status === "error") && (
            <div className="text-sm text-destructive">
              {error ?? run?.errorMessage ?? "Something went wrong."}
            </div>
          )}

          {/* ── Result view ─────────────────────────────────────────────── */}
          {artifact && !isRerunMode ? (
            <>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span className="text-foreground/80 font-medium">
                  Interview prep has been generated for this role.
                </span>
                <br /><br />
                {artifact.payload.summary}

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsReportOpen(true);
                      onCloseOthers?.();
                    }}
                  >
                    See full prep
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setIsRerunMode(true);
                    }}
                  >
                    Re-generate
                  </Button>
                </div>
              </div>

              <InterviewPrepReport
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                artifact={artifact}
                jobLabel={jobLabel}
                sourceDocLabel={artifact.sourceDocumentName ?? undefined}
              />
            </>
          ) : (
            /* ── Generate / re-run mode ─────────────────────────────────── */
            <>
              <div className="mt-5 space-y-2">
                {/* Resume status — shows what will be used (or JD-only notice) */}
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
                    // No resume available — JD-only mode
                    <p className="text-muted-foreground">
                      <span className="text-foreground/80">Using: </span>
                      <span className="font-medium text-foreground/80">Job description only</span>
                      <span className="ml-1">
                        —{" "}
                        <button
                          type="button"
                          className="underline underline-offset-2 hover:text-foreground"
                          onClick={() => overrideInputRef.current?.click()}
                        >
                          upload a resume
                        </button>
                        {" "}for richer output
                      </span>
                    </p>
                  )}
                </div>

                {/* Clear uploaded override */}
                {overrideFile && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-red-600"
                    onClick={() => {
                      setOverrideFile(null);
                      if (overrideInputRef.current) overrideInputRef.current.value = "";
                    }}
                  >
                    ✕ Remove
                  </button>
                )}

                {/* Picked existing doc */}
                {selectedDocId && !overrideFile && (
                  <div className="space-y-1 text-xs">
                    <div className="text-muted-foreground">
                      <span className="text-foreground/80">Resume: </span>
                      <span className="text-foreground">
                        {resumeDocs.find((d) => d.id === selectedDocId)?.originalName}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-red-600"
                      onClick={() => setSelectedDocId(null)}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                {/* Doc picker from application — only when docs exist and nothing selected */}
                {resumeDocs.length > 0 && !overrideFile && !selectedDocId && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className={!showDocPicker
                        ? "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        : "flex items-center gap-1 text-xs text-foreground"}
                      onClick={() => setShowDocPicker((v) => !v)}
                    >
                      {showDocPicker
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />}
                      {"Pick from this application's documents"}
                    </button>

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
                  onChange={(e) => {
                    setSelectedDocId(null);
                    setOverrideFile(e.target.files?.[0] ?? null);
                  }}
                />
              </div>

              <div className="pt-2 border-t space-y-2">
                {isBlocked && !isRerunMode ? (
                  <BlockedRunButton plan={plan} />
                ) : (
                  <>
                    <Button disabled={!canRun} onClick={handleGenerate} className={isRerunMode ? "" : "w-full mb-2"}>
                      Generate interview prep
                    </Button>
                    {!isRerunMode && <CreditCostNote plan={plan} cost={creditCost} />}
                  </>
                )}
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