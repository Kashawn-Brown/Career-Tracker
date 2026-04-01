"use client";

import { ToolInfoPopover } from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }       from "@/lib/tool-info";

import { useEffect, useRef, useState } from "react";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { CoverLetterReport }   from "@/components/applications/drawer/CoverLetterReport";
import type { Application, AiArtifact, CoverLetterPayload } from "@/types/api";

// Accepted file types
const RESUME_ACCEPT   = ".pdf,.txt,.docx";
// Template: TXT and DOCX (editable cover letter formats).
// PDF excluded — it's a final-output format, not a working document.
const TEMPLATE_ACCEPT = ".txt,.docx";

interface Props {
  application:      Application;
  baseResumeExists: boolean;
  canUseAi:         boolean;
  onCloseOthers?:   () => void;
  onRegisterClose?: (fn: () => void) => void;
  onRefreshMe:      () => void;
}

export function CoverLetterCard({
  application,
  baseResumeExists,
  canUseAi,
  onCloseOthers,
  onRegisterClose,
  onRefreshMe,
}: Props) {
  // Latest persisted artifact
  const [artifact,      setArtifact]      = useState<AiArtifact<CoverLetterPayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Generation state
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isRerunMode, setIsRerunMode] = useState(false);

  // Report panel open/close
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Per-tool resume override
  const [overrideFile, setOverrideFile] = useState<File | null>(null);
  const overrideInputRef                = useRef<HTMLInputElement>(null);

  // Template: user uploads an existing cover letter (.txt or .docx)
  // The text is extracted client-side and sent to the backend as a string.
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
      .catch(() => { /* silent — not a hard failure */ })
      .finally(() => { if (!cancelled) setLoadingLatest(false); });

    return () => { cancelled = true; };
  }, [application.id]);

  // Extract text from an uploaded template file client-side.
  // TXT → FileReader; DOCX → mammoth browser build.
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
  const canRun      = hasJd && resumeReady && canUseAi && !loading;

  const jobLabel = [application.position, application.company].filter(Boolean).join(" at ");

  async function handleGenerate() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await applicationsApi.generateAiArtifact(application.id, {
        kind:         "COVER_LETTER",
        templateText: templateText.trim() || undefined,
      });

      if (mountedRef.current) {
        setArtifact(result as AiArtifact<CoverLetterPayload>);
        setIsRerunMode(false);
        // Auto-open the report after a successful generation
        setIsReportOpen(true);
        onCloseOthers?.();
        onRefreshMe();
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err.message : "Failed to generate cover letter.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      {/* ── Card header — always visible ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Cover Letter</div>
          <div className="text-xs text-muted-foreground mt-0.5">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Result-first view — shown when a cover letter exists ────────────
           Mirrors how CompatibilityCheckCard shows the result without
           requiring the user to expand anything first.                       */}
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

          
          {/* Report panel — center panel */}
          <CoverLetterReport
            open={isReportOpen}
            onOpenChange={(open) => {
              setIsReportOpen(open);
            }}
            artifact={artifact}
            jobLabel={jobLabel}
          />
        </>
      ) : (
        /* ── Generate / re-run mode ─────────────────────────────────────── */
        <>
          {/* Resume override */}
          <div className="flex items-center gap-2 mt-5">
            <button
              type="button"
              className={overrideFile ? "text-xs hover:font-semibold" : baseResumeExists ? "text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" : "text-xs text-red-500 underline underline-offset-2 hover:font-semibold"}
              onClick={() => overrideInputRef.current?.click()}
            >
              {overrideFile 
              ? `Resume file: ${overrideFile.name}` 
              : baseResumeExists ? "(Optional) Upload a different resume to use" 
              : "A resume is needed to generate a cover letter. Click to upload one now."}
            </button>
            {overrideFile && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:font-semibold hover:text-red-500"
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

          {/* Template upload — existing cover letter to build from */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={templateFile ? "text-xs hover:font-semibold" : "text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"}
              onClick={() => templateInputRef.current?.click()}
            >
              {templateFile
                ? `Cover letter / template file: ${templateFile.name}`
                : "(Optional): Upload an existing cover letter / template"}
            </button>
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
            <Button
              disabled={!canRun}
              onClick={handleGenerate}
              className={isRerunMode ? "" : "w-full"}
            >
              {loading ? "Generating…" : "Generate cover letter"}
            </Button>
            {/* Cancel re-run mode */}
            {isRerunMode && (
              <Button
                variant="outline"
                onClick={() => { setError(null); setIsRerunMode(false); }}
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}