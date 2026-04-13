"use client";

import { useApplicationDocs } from "@/hooks/useApplicationDocs";

import { useEffect, useRef, useState } from "react";
import { CreditCostNote, BlockedRunButton } from "@/components/tools/ToolEntitlementGate";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { CoverLetterReport }   from "@/components/applications/drawer/CoverLetterReport";
import { ToolInfoPopover }     from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }           from "@/lib/tool-info";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolRunProgress } from "@/components/applications/drawer/ToolRunProgress";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import type { Application, AiArtifact, CoverLetterPayload } from "@/types/api";

const RESUME_ACCEPT   = ".pdf,.txt,.docx";
const TEMPLATE_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  application:          Application;
  baseResumeExists:     boolean;
  // Whether the user has a stored base cover letter template — shown as the
  // default template indicator with an opt-out option in the generate form.
  baseCoverLetterExists: boolean;
  canUseAi:             boolean;
  isBlocked?:   boolean;
  plan?:        string;
  creditCost?:  number;
  documentToolRuns:     DocumentToolRunsController;
  onCloseOthers?:       () => void;
  onRegisterClose?:     (fn: () => void) => void;
  onDocumentsChanged?:  (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;
  onRefreshMe:          () => void;
  // Incremented by the drawer whenever a document is added, so the resume
  // and template pickers re-fetch without requiring a full drawer close/reopen.
  docsReloadKey?: number;
}

export function CoverLetterCard({
  application,
  baseResumeExists,
  baseCoverLetterExists,
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
  // Latest persisted artifact
  const [artifact,      setArtifact]      = useState<AiArtifact<CoverLetterPayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const [error,         setError]         = useState<string | null>(null);
  const [isRerunMode,   setIsRerunMode]   = useState(false);

  // Report panel open/close
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Per-tool resume override
  const [overrideFile,  setOverrideFile]  = useState<File | null>(null);
  const overrideInputRef                  = useRef<HTMLInputElement>(null);

  // User can pick an already-attached application doc instead of uploading again
  const [selectedDocId,  setSelectedDocId]  = useState<number | null>(null);
  // Controls visibility of the "pick from application" dropdown
  const [showDocPicker,  setShowDocPicker]  = useState(false);

  // When true, skip the base cover letter template for this run
  const [skipBaseTemplate, setSkipBaseTemplate] = useState(false);

  // Fetch resume-type docs attached to this application.
  // Re-fetches whenever docsReloadKey changes (doc added in the drawer).
  const { resumeDocs } = useApplicationDocs(application.id, docsReloadKey);

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

  // Re-fetch artifact when a background run completes
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

  // Extract text from a template file client-side.
  // DOCX → mammoth browser build; everything else → FileReader plain text.
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
  const resumeReady = overrideFile || selectedDocId ? true : baseResumeExists;
  const isRunning   = run?.status === "running";
  const canRun      = hasJd && resumeReady && canUseAi && !isRunning;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setError(null);

    try {
      await documentToolRuns.startRun({
        applicationId:               application.id,
        kind:                        "COVER_LETTER",
        overrideFile:                overrideFile ?? undefined,
        sourceDocumentId:            overrideFile ? undefined : (selectedDocId ?? undefined),
        templateText:                templateText.trim() || undefined,
        skipBaseCoverLetterTemplate: skipBaseTemplate && !templateFile,
        onDocumentsChanged,
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
      {isBlocked && !run ? (
        <p className="mt-3 text-xs text-muted-foreground border border-destructive/20 rounded-md bg-destructive/5 px-3 py-2">
          Monthly credit limit reached — this tool is unavailable until your credits reset.
        </p>
      ) : isRunning && run ? (
        <ToolRunProgress
          steps={run.steps}
          activeIndex={run.activeIndex}
          onCancel={() => documentToolRuns.cancelRun(application.id, "COVER_LETTER")}
        />
      ) : (
        <>
          {/* ── Error ─────────────────────────────────────────────────── */}
          {(error || run?.status === "error") && (
            <div className="text-sm text-destructive">
              {error ?? run?.errorMessage ?? "Something went wrong."}
            </div>
          )}

          {/* ── Result-first view ──────────────────────────────────────── */}
          {artifact && !isRerunMode ? (
            <>
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

              <CoverLetterReport
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                artifact={artifact}
                jobLabel={jobLabel}
              />
            </>
          ) : (
            /* ── Generate / re-run mode ─────────────────────────────── */
            <>
              {/* ── Resume source ─────────────────────────────────────── */}
              {/* upload new file, OR pick a doc already attached, OR use base resume */}
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
                              setShowDocPicker(false); // collapse after selection
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

              {/* ── Cover letter template ────────────────────────────────── */}
              {/* Base template auto-used when saved. User can swap, opt out, or upload a one-off for this run. */}
              <div className="space-y-1.5 mt-[-8px]">
                <div className="text-xs text-muted-foreground mb-0">
                  {templateFile ? (
                    <button type="button" onClick={() => templateInputRef.current?.click()}>
                      Template: <span className="text-foreground hover:underline underline-offset-2">{templateFile.name}</span>
                    </button>
                  ) : baseCoverLetterExists && !skipBaseTemplate ? (  // Base template active
                    <div>
                      <div>
                        <span className="text-foreground/80">Using: </span>
                        <span className="font-medium text-foreground/80">Base cover letter</span>
                      </div>
                      <div className="mt-1">
                        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => templateInputRef.current?.click()}>
                          Use a different one
                        </button>
                        {" or "}
                        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setSkipBaseTemplate(true)}>
                          use no template
                        </button>.
                      </div>
                    </div>
                  ) : skipBaseTemplate && !templateFile ? (  // User opted out of using a template
                    <div>
                      <div>
                        <span className="text-foreground/80">Using: </span>
                        <span className="font-medium text-foreground/80">No template</span>
                      </div>
                      <div className="mt-1">
                        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setSkipBaseTemplate(false)}>
                          Use base cover letter
                        </button>
                        {" or "}
                        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => templateInputRef.current?.click()}>
                          upload one
                        </button>.
                      </div>
                    </div>
                  ) : (  // No base template saved
                    <button type="button" className="hover:text-foreground" onClick={() => templateInputRef.current?.click()}>
                      <span className="underline underline-offset-2">Upload a cover letter / template to build from</span>
                      <span> (optional)</span>
                    </button>
                  )}
                </div>
                {templateFile && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:font-medium hover:text-red-600 mb-0"
                    onClick={() => {
                      void handleTemplateFile(null);
                      if (templateInputRef.current) templateInputRef.current.value = "";
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
                <input
                  ref={templateInputRef}
                  type="file"
                  accept={TEMPLATE_ACCEPT}
                  className="hidden"
                  onChange={(e) => { setSkipBaseTemplate(false); void handleTemplateFile(e.target.files?.[0] ?? null); }}
                />
              </div>

              <div className="pt-2 border-t space-y-2">
                {isBlocked && !isRerunMode ? (
                  <BlockedRunButton />
                ) : (
                  <>
                    <Button disabled={!canRun} onClick={handleGenerate} className={isRerunMode ? "" : "w-full mb-2"}>
                      Generate cover letter
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