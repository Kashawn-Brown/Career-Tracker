"use client";

import { useEffect, useRef, useState } from "react";
import { Button }           from "@/components/ui/button";
import { Card }             from "@/components/ui/card";
import { ApiError }         from "@/lib/api/client";
import { applicationsApi }  from "@/lib/api/applications";
import { ResumeAdviceResult } from "@/components/tools/ResumeAdviceResult";
import type { Application, AiArtifact, ResumeAdvicePayload } from "@/types/api";

interface Props {
  application:     Application;
  baseResumeExists: boolean;
  canUseAi:        boolean;
  onCloseOthers?:  () => void;
  onRegisterClose?: (fn: () => void) => void;
  onRefreshMe:     () => void;
}

export function ResumeAdviceCard({
  application,
  baseResumeExists,
  canUseAi,
  onCloseOthers,
  onRegisterClose,
  onRefreshMe,
}: Props) {
  const [artifact,     setArtifact]     = useState<AiArtifact<ResumeAdvicePayload> | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [isOpen,       setIsOpen]       = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  // Close result panel when drawer registers a close sweep
  useEffect(() => {
    onRegisterClose?.(() => setIsOpen(false));
  }, [onRegisterClose]);

  // Load latest artifact for this application on mount / app change
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

  const hasJd = Boolean(application.description?.trim());
  const canRun = hasJd && baseResumeExists && canUseAi && !loading;

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
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Resume Advice</div>
          <div className="text-xs text-muted-foreground">
            Tailored to this job description and your resume.
          </div>
        </div>
        {loadingLatest && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      {/* Readiness */}
      {(!hasJd || !baseResumeExists) && (
        <div className="space-y-1 text-xs">
          {!hasJd && (
            <div className="flex justify-between">
              <span>Job description</span>
              <span className="text-destructive">Missing</span>
            </div>
          )}
          {!baseResumeExists && (
            <div className="flex justify-between">
              <span>Base resume</span>
              <span className="text-destructive">Not uploaded</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Result summary */}
      {artifact && !isOpen && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground line-clamp-2">
          {artifact.payload.summary}
        </div>
      )}

      <div className="flex items-center gap-2">
        {artifact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsOpen((v) => !v); onCloseOthers?.(); }}
          >
            {isOpen ? "Hide" : "View advice"}
          </Button>
        )}
        <Button
          size="sm"
          variant={artifact ? "outline" : "default"}
          disabled={!canRun}
          onClick={handleGenerate}
          className={artifact ? "" : "w-full"}
        >
          {loading ? "Generating…" : artifact ? "Regenerate" : "Get resume advice"}
        </Button>
      </div>

      {/* Inline result */}
      {isOpen && artifact && (
        <div className="border-t pt-3">
          <ResumeAdviceResult payload={artifact.payload} />
        </div>
      )}
    </Card>
  );
}