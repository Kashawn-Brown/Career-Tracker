"use client";

import { useEffect, useRef, useState } from "react";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { CoverLetterReport }   from "@/components/applications/drawer/CoverLetterReport";
import { ToolInfoPopover }     from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }           from "@/lib/tool-info";
import { Loader2 } from "lucide-react";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import type { Application, AiArtifact, CoverLetterPayload } from "@/types/api";

const RESUME_ACCEPT   = ".pdf,.txt,.docx";
// Template: editable cover letter formats — PDF excluded (final-output format)
const TEMPLATE_ACCEPT = ".txt,.docx";

interface Props {
  application:          Application;
  baseResumeExists:     boolean;
  // Whether the user has a stored base cover letter template — shown as the
  // default template indicator with an opt-out option in the generate form.
  baseCoverLetterExists: boolean;
  canUseAi:             boolean;
  documentToolRuns:   DocumentToolRunsController;
  onCloseOthers?:     () => void;
  onRegisterClose?:   (fn: () => void) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:        () => void;
}

export function CoverLetterCard({
  application,
  baseResumeExists,
  baseCoverLetterExists,
  canUseAi,
  documentToolRuns,
  onCloseOthers,
  onRegisterClose,
  onApplicationChanged,
  onRefreshMe,
}: Props) {
  // Latest persisted artifact
  const [artifact,      setArtifact]      = useState<AiArtifact<CoverLetterPayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const [error,         setError]         = useState<string | null>(null);
  const [isRerunMode,   setIsRerunMode]   = useState(false);
  // Report panel open/close
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Per-tool resume override
  const [overrideFile, setOverrideFile] = useState<File | null>(null);
  const overrideInputRef                = useRef<HTMLInputElement>(null);

  // Template: user uploads existing cover letter — text extracted client-side
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState<string>("");
  const templateInputRef                = useRef<HTMLInputElement>(null);

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

  // Load the latest COVER_LETTER artifact when the application changes
  useEffect(() => {
    let cancelled = false;
    setArtifact(null);
    setIsReportOpen(false);
    setIsRerunMode(false);
    setLoadingLatest(true);

    applicationsApi
      .listAiArtifacts(application.id, { kind: "COVER_LETTER" })
      .then((res) => {
        if (!cancelled) setArtifact((res?.[0] as AiArtifact<CoverLetterPayload>) ?? null);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoadingLatest(false); });

    return () => { cancelled = true; };
  }, [application.id]);

  // Re-fetch artifact when background run completes
  const run = documentToolRuns.getRun(application.id, "COVER_LETTER");
  const prevRunStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevRunStatusRef.current !== "success" && run?.status === "success") {
      applicationsApi
        .listAiArtifacts(application.id, { kind: "COVER_LETTER" })
        .then((res) => {
          if (mountedRef.current) {
            setArtifact((res?.[0] as AiArtifact<CoverLetterPayload>) ?? null);
            setIsRerunMode(false);
          }
        })
        .catch(() => { /* silent */ });
    }
    prevRunStatusRef.current = run?.status ?? null;
  }, [run?.status, application.id]);

  // Extract text from a template file client-side
  async function handleTemplateFile(file: File | null) {
    setTemplateFile(file);
    setTemplateText("");
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buffer  = await file.arrayBuffer();
      const result  = await mammoth.extractRawText({ arrayBuffer: buffer });
      setTemplateText(result.value ?? "");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTemplateText(typeof e.target?.result === "string" ? e.target.result : "");
      };
      reader.readAsText(file);
    }
  }

  const hasJd       = Boolean(application.description?.trim());
  const resumeReady = overrideFile ? true : baseResumeExists;
  const isRunning   = run?.status === "running";
  const canRun      = hasJd && resumeReady && canUseAi && !isRunning;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setError(null);

    try {
      await documentToolRuns.startRun({
        applicationId:      application.id,
        kind:               "COVER_LETTER",
        templateText:       templateText.trim() || undefined,
        onApplicationChanged,
        onRefreshMe,
      });
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err.message : "Failed to generate cover letter.");
      }
    }
  }

  return (
    <Card className="p-4">
      {/* ── Card header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-md font-medium">Cover Letter</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Generate a tailored draft cover letter for this role.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loadingLatest && <span className="text-xs text-muted-foreground">Loading…</span>}
          {/* ? button — explains what the tool does and what inputs it needs */}
          <ToolInfoPopover
            title={TOOL_INFO.COVER_LETTER.title}
            content={TOOL_INFO.COVER_LETTER.content}
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
            <div className="h-1.5 rounded bg-primary w-1/2 animate-pulse" />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => documentToolRuns.cancelRun(application.id, "COVER_LETTER")}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Error from background run ─────────────────────────────────────── */}
          {(error || run?.status === "error") && (
            <div className="text-sm text-destructive">
              {error ?? run?.errorMessage ?? "Something went wrong."}
            </div>
          )}

          {/* ── Result-first view ──────────────────────────────────────── */}
          {artifact && !isRerunMode ? (
            <>
              {/* Confirmation message — tells the user what was made */}
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground line-clamp-12">
                <span className="text-foreground/80 font-medium">
                  A cover letter for {jobLabel} has been drafted.
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
                    View draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setIsRerunMode(true);
                    }}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* ── Cover Letter Report panel ─────────────────────────────────────────── */}
              <CoverLetterReport
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                artifact={artifact}
                jobLabel={jobLabel}
              />
            </>
          ) : (
            /* ── Generate / re-run mode ─────────────────────────────────────── */
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

              {/* Cover letter template upload */}
              <div className="flex items-center gap-2">
                <div className="text-xs">
                  {templateFile ? (
                    // User uploaded a template for this run — show the filename
                    <button
                      type="button"
                      className="text-muted-foreground"
                      onClick={() => templateInputRef.current?.click()}
                    >
                      <span className="text-muted-foreground">Cover Letter Template: </span>
                      <span className="text-foreground hover:underline underline-offset-2">{templateFile.name}</span>
                    </button>
                  ) : baseCoverLetterExists ? (
                    // Base cover letter is saved — it will be used automatically.
                    // Offer the user an opt-out (upload a different one for this run).
                    <>
                      <div className="text-muted-foreground">
                        <span className="text-foreground/80">Using: </span>
                        <span className="font-medium text-foreground/80">Base cover letter</span>
                      </div>  
                      <button
                        type="button"
                        className="text-muted-foreground underline underline-offset-2 hover:text-foreground mt-1"
                        onClick={() => templateInputRef.current?.click()}
                      >
                        Use a different cover letter
                      </button>
                      <span className="text-muted-foreground"> (optional)</span>
                      
                    </>
                  ) : (
                    // No base template saved — offer upload as optional
                    <button
                      type="button"
                      className="text-muted-foreground"
                      onClick={() => templateInputRef.current?.click()}
                    >
                      <span className="underline underline-offset-2 hover:text-foreground">Upload a cover letter / template to build from</span>
                      <span> (optional)</span>
                    </button>
                  )}
                </div>
                {templateFile && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:font-semibold hover:text-red-500"
                    onClick={() => {
                      void handleTemplateFile(null);
                      if (templateInputRef.current) templateInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                )}
                <input
                  ref={templateInputRef}
                  type="file"
                  accept={TEMPLATE_ACCEPT}
                  className="hidden"
                  onChange={(e) => void handleTemplateFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button disabled={!canRun} onClick={handleGenerate} className={isRerunMode ? "" : "w-full"}>
                  Generate cover letter
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