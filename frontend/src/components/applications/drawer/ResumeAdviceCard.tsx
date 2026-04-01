"use client";

import { ToolInfoPopover } from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }       from "@/lib/tool-info";

import { useEffect, useRef, useState } from "react";
import { Button }              from "@/components/ui/button";
import { Card }                from "@/components/ui/card";
import { ApiError }            from "@/lib/api/client";
import { applicationsApi }     from "@/lib/api/applications";
import { ResumeAdviceReport }  from "@/components/applications/drawer/ResumeAdviceReport";
import type { Application, AiArtifact, ResumeAdvicePayload } from "@/types/api";

// Accepted file types for resume override
const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  application:      Application;
  baseResumeExists: boolean;
  canUseAi:         boolean;
  onCloseOthers?:   () => void;
  onRegisterClose?: (fn: () => void) => void;
  onRefreshMe:      () => void;
}

export function ResumeAdviceCard({
  application,
  baseResumeExists,
  canUseAi,
  onCloseOthers,
  onRegisterClose,
  onRefreshMe,
}: Props) {
  // Latest persisted artifact for this application
  const [artifact,      setArtifact]      = useState<AiArtifact<ResumeAdvicePayload> | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Generation state
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isRerunMode, setIsRerunMode] = useState(false);

  // Report panel open/close
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Per-tool resume override — independent of the Fit card's override
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

  // Load the latest RESUME_ADVICE artifact when the application changes
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
      .catch(() => { /* silent — not a hard failure */ })
      .finally(() => { if (!cancelled) setLoadingLatest(false); });

    return () => { cancelled = true; };
  }, [application.id]);

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
        kind: "RESUME_ADVICE",
      });

      if (mountedRef.current) {
        setArtifact(result as AiArtifact<ResumeAdvicePayload>);
        setIsRerunMode(false);
        // Auto-open the report after a successful generation
        setIsReportOpen(true);
        onCloseOthers?.();
        onRefreshMe();
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err.message : "Failed to generate resume advice.");
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
          <div className="text-sm font-medium">Resume Advice</div>
          <div className="text-xs text-muted-foreground mt-0.5">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Result-first view — shown when advice exists ─────────────────
           Mirrors how CompatibilityCheckCard shows the result summary
           without prompting the user to generate again.                     */}
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

          

          {/* Report panel — center panel like FitReport */}
          <ResumeAdviceReport
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
            <button
              type="button"
              className={overrideFile ? "text-xs hover:font-semibold" : baseResumeExists ? "text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" : "text-xs text-red-600 underline underline-offset-2 hover:font-semibold"}
              onClick={() => overrideInputRef.current?.click()}
            >
              {overrideFile 
              ? `Resume file: ${overrideFile.name}` 
              : baseResumeExists ? "(Optional) Upload a different resume to use" 
              : "A resume is needed to evaluate. Click to upload one now."}
            </button>
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
            <Button
              disabled={!canRun}
              onClick={handleGenerate}
              className={isRerunMode ? "" : "w-full"}
            >
              {loading ? "Generating…" : "Get resume advice"}
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