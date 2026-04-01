"use client";

import { useEffect, useRef, useState } from "react";
import { Button }            from "@/components/ui/button";
import { Card }              from "@/components/ui/card";
import { ApiError }          from "@/lib/api/client";
import { applicationsApi }   from "@/lib/api/applications";
import { ResumeAdviceResult } from "@/components/tools/ResumeAdviceResult";
import type { Application, AiArtifact, ResumeAdvicePayload } from "@/types/api";

// Accepted file types for resume override — PDF, plain text, and Word docs
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
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Result panel open/close
  const [isOpen, setIsOpen] = useState(false);

  // Per-tool resume override — independent of the Fit card's override
  const [overrideFile, setOverrideFile] = useState<File | null>(null);
  const overrideInputRef                = useRef<HTMLInputElement>(null);

  // Guards against stale setState after unmount or application switch
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  // Register close handler so the parent can collapse this panel
  // when another panel opens (mutual-close pattern)
  useEffect(() => {
    onRegisterClose?.(() => setIsOpen(false));
  }, [onRegisterClose]);

  // Load the latest RESUME_ADVICE artifact when the application changes
  useEffect(() => {
    let cancelled = false;
    setArtifact(null);
    setIsOpen(false);
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

  const hasJd      = Boolean(application.description?.trim());
  // Resume is ready if the user has an override file for this run OR a base resume saved
  const resumeReady = overrideFile ? true : baseResumeExists;
  const canRun      = hasJd && resumeReady && canUseAi && !loading;

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
        setIsOpen(true);
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
        <div className="min-w-0 mb-2">
          <div className="text-sm font-medium">Resume Advice</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Evaluate and get advice on improving your resume for this specific role.
          </div>
        </div>
        {loadingLatest && (
          <span className="shrink-0 text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      {/* ── Resume override ────────────────────────────────────────────────
           Each tool manages its own override so the user can use different
           resume versions for Fit vs Resume Advice independently.           */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => overrideInputRef.current?.click()}
        >
          {overrideFile ? `Resume: ${overrideFile.name}` : "Use a different resume"}
        </button>
        {overrideFile && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Artifact summary preview ───────────────────────────────────────
           Shows the summary of the last run so the user knows a result
           exists without needing to expand it first.                        */}
      {artifact && !isOpen && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground line-clamp-2">
          {artifact.payload.summary}
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2 border-t space-y-2">
        {artifact && (
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen((v) => !v);
              if (!isOpen) onCloseOthers?.();
            }}
          >
            {isOpen ? "Hide" : "View advice"}
          </Button>
        )}
        <Button
          variant={artifact ? "outline" : "default"}
          disabled={!canRun}
          onClick={handleGenerate}
          className={artifact ? "" : "w-full"}
        >
          {loading ? "Generating…" : artifact ? "Regenerate" : "Get resume advice"}
        </Button>
      </div>

      {/* ── Expanded result ───────────────────────────────────────────── */}
      {isOpen && artifact && (
        <div className="border-t pt-3">
          <ResumeAdviceResult payload={artifact.payload} />
        </div>
      )}
    </Card>
  );
}