"use client";

import { useRef, useState } from "react";
import { Button }            from "@/components/ui/button";
import { ApiError }          from "@/lib/api/client";
import { aiApi }             from "@/lib/api/ai";
import { ResumeAdviceResult } from "@/components/tools/ResumeAdviceResult";
import { ToolInfoPopover }   from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }         from "@/lib/tool-info";
import { PastRunsSection }   from "@/components/tools/PastRunsSection";
import type { UserAiArtifact, ResumeAdvicePayload } from "@/types/api";

// Accepted resume file types (matches backend allowlist)
const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  hasBaseResume: boolean;
  onSuccess:     () => void; // called after a successful run to refresh credit count
}

/**
 * GenericResumeHelpCard — card-first layout for the Tools page.
 *
 * Collapsed by default: shows name, description, and ? info button.
 * Clicking "Get started" expands the form inline.
 * After a successful run the result appears below the form.
 */
export function GenericResumeHelpCard({ hasBaseResume, onSuccess }: Props) {
  // Whether the form is expanded (card-first: collapsed by default)
  const [expanded, setExpanded] = useState(false);

  const [targetField,       setTargetField]       = useState("");
  const [targetRolesText,   setTargetRolesText]   = useState("");
  const [targetKeywords,    setTargetKeywords]     = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [resumeFile,        setResumeFile]         = useState<File | null>(null);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [artifact, setArtifact] = useState<UserAiArtifact<ResumeAdvicePayload> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // At least one targeting field required so the output isn't generic mush
  const hasTarget = targetField.trim() || targetRolesText.trim() || additionalContext.trim();
  const canRun    = hasTarget && (hasBaseResume || resumeFile);

  async function handleSubmit() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await aiApi.resumeHelp({
        targetField:       targetField.trim()      || undefined,
        targetRolesText:   targetRolesText.trim()  || undefined,
        targetKeywords:    targetKeywords.trim()   || undefined,
        additionalContext: additionalContext.trim() || undefined,
        resumeFile:        resumeFile ?? undefined,
      });
      setArtifact(result);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const info = TOOL_INFO.GENERIC_RESUME_HELP;

  return (
    <div className="rounded-lg border bg-card">

      {/* ── Card header — always visible ──────────────────────────────────
           Shows the tool name, description, and ? info button.
           "Get started" expands the form; stays visible after expansion.  */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{info.title}</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Get actionable advice to improve your resume for your target roles.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ToolInfoPopover title={info.title} content={info.content} />
          {!expanded && (
            <Button size="sm" onClick={() => setExpanded(true)}>
              Get started
            </Button>
          )}
        </div>
      </div>

      {/* ── Past runs — shown in collapsed state so users see previous results
           without needing to open the form first. Up to 3 stored per user. */}
      <PastRunsSection kind="RESUME_ADVICE" />

      {/* ── Expanded form ─────────────────────────────────────────────────*/}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-4">
          <div className="flex justify-end mb-0">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Collapse
            </button>
          </div>

          {/* Resume source */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resume
            </label>
            <div className="mt-1.5 space-y-1.5">
              {resumeFile ? (
                null
              ) : hasBaseResume ? (
                <p className="text-sm text-muted-foreground">
                  Will be using your saved base resume. Or you can {" "} 
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload a different one
                  </button>{" "}
                  to use for this run.
                </p>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No base resume saved.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload a resume to continue
                  </button>
                  , or{" "}
                  <a href="/profile" className="underline underline-offset-2">
                    add one to your profile
                  </a>
                  .
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={RESUME_ACCEPT}
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
              {resumeFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate hover:font-semibold">{resumeFile.name}</span>
                  <button
                    type="button"
                    className="text-xs hover:text-foreground hover:font-semibold hover:text-red-600"
                    onClick={() => {
                      setResumeFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <Field
            label="Target field / function"
            placeholder="e.g. Software Engineering, Product Management"
            value={targetField}
            onChange={setTargetField}
          />
          <Field
            label="Target roles"
            placeholder="e.g. Backend Engineer, Full Stack Developer"
            value={targetRolesText}
            onChange={setTargetRolesText}
          />
          <Field
            label="Target keywords (optional)"
            placeholder="e.g. TypeScript, PostgreSQL, CI/CD"
            value={targetKeywords}
            onChange={setTargetKeywords}
          />

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Additional context (optional)
            </label>
            <textarea
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Years of experience, industries you've worked in, anything else we should consider…"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={!canRun || loading} className="w-full">
            {loading ? "Generating…" : "Get resume advice"}
          </Button>

          {/* Result rendered inline below the form after a successful run */}
          {artifact && (
            <div className="border-t pt-5">
              <ResumeAdviceResult payload={artifact.payload} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <input
        type="text"
        className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}