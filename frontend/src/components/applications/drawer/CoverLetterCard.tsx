"use client";

import { useEffect, useRef, useState } from "react";
import { Button }            from "@/components/ui/button";
import { Card }              from "@/components/ui/card";
import { ApiError }          from "@/lib/api/client";
import { applicationsApi }   from "@/lib/api/applications";
import { CoverLetterResult } from "@/components/tools/CoverLetterResult";
import type { Application, AiArtifact, CoverLetterPayload } from "@/types/api";

// Resumes accept PDF, TXT, and DOCX (backend extracts text from all three)
const RESUME_ACCEPT   = ".pdf,.txt,.docx";
// Template files: TXT and DOCX — both editable cover letter formats.
// PDF is intentionally excluded (it's a final-output format, not a working document).
// TXT is read via FileReader; DOCX is extracted via mammoth (browser build).
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
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Result panel
  const [isOpen, setIsOpen] = useState(false);

  // Per-tool resume override
  const [overrideFile, setOverrideFile] = useState<File | null>(null);
  const overrideInputRef                = useRef<HTMLInputElement>(null);

  // Template: user can upload their existing cover letter as a .txt file
  // so the AI builds on or follows its structure/tone.
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState<string>("");
  const templateInputRef                = useRef<HTMLInputElement>(null);

  // Guards against stale setState after unmount or app switch
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [application.id]);

  useEffect(() => {
    onRegisterClose?.(() => setIsOpen(false));
  }, [onRegisterClose]);

  // Load the latest COVER_LETTER artifact when the application changes
  useEffect(() => {
    let cancelled = false;
    setArtifact(null);
    setIsOpen(false);
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

  // When the user selects a template file, extract its text client-side.
  // TXT files use the native FileReader API.
  // DOCX files use mammoth's browser build to extract plain text.
  // The extracted string is sent to the backend as the templateText field.
  async function handleTemplateFile(file: File | null) {
    setTemplateFile(file);
    setTemplateText("");
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".docx")) {
      // mammoth.extractRawText works in the browser when passed an ArrayBuffer
      const mammoth  = await import("mammoth");
      const buffer   = await file.arrayBuffer();
      const result   = await mammoth.extractRawText({ arrayBuffer: buffer });
      setTemplateText(result.value ?? "");
    } else {
      // Plain text — read directly
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = typeof e.target?.result === "string" ? e.target.result : "";
        setTemplateText(text);
      };
      reader.readAsText(file);
    }
  }

  const hasJd       = Boolean(application.description?.trim());
  const resumeReady = overrideFile ? true : baseResumeExists;
  const canRun      = hasJd && resumeReady && canUseAi && !loading;

  async function handleGenerate() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await applicationsApi.generateAiArtifact(application.id, {
        kind:         "COVER_LETTER",
        // Only send templateText if a template was actually provided
        templateText: templateText.trim() || undefined,
      });

      if (mountedRef.current) {
        setArtifact(result as AiArtifact<CoverLetterPayload>);
        setIsOpen(true);
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
        <div className="min-w-0 mb-2">
          <div className="text-sm font-medium">Cover Letter</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Generate a tailored draft cover letter for this role.
          </div>
        </div>
        {loadingLatest && (
          <span className="shrink-0 text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      {/* ── Resume override ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => overrideInputRef.current?.click()}
        >
          {overrideFile ? `Resume: ${overrideFile.name}` : "Use a different resume (optional)"}
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

      {/* ── Template upload ────────────────────────────────────────────────
           User can upload an existing cover letter (.txt) as a template.
           The AI will follow its structure/tone when generating the draft.   */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => templateInputRef.current?.click()}
        >
          {templateFile
            ? `Template: ${templateFile.name}`
            : "Upload your existing cover letter or a templateto build from (.txt or .docx)"}
        </button>
        {templateFile && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              handleTemplateFile(null);
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
          onChange={(e) => handleTemplateFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Artifact summary preview ─────────────────────────────────────── */}
      {artifact && !isOpen && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground line-clamp-2">
          {artifact.payload.summary}
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2 border-t space-y-2">
        {artifact && (
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen((v) => !v);
              if (!isOpen) onCloseOthers?.();
            }}
          >
            {isOpen ? "Hide" : "View draft"}
          </Button>
        )}
        <Button
          variant={artifact ? "outline" : "default"}
          disabled={!canRun}
          onClick={handleGenerate}
          className={artifact ? "" : "w-full"}
        >
          {loading ? "Generating…" : artifact ? "Regenerate" : "Generate cover letter"}
        </Button>
      </div>

      {/* ── Expanded result ──────────────────────────────────────────────── */}
      {isOpen && artifact && (
        <div className="border-t pt-3">
          <CoverLetterResult payload={artifact.payload} />
        </div>
      )}
    </Card>
  );
}