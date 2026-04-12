"use client";

import { useRef, useState } from "react";
import { Button }                from "@/components/ui/button";
import { ApiError }              from "@/lib/api/client";
import { aiApi }                 from "@/lib/api/ai";
import { InterviewPrepResult }   from "@/components/tools/InterviewPrepResult";
import { ToolInfoPopover }       from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }             from "@/lib/tool-info";
import { PastRunsSection }       from "@/components/tools/PastRunsSection";
import type { UserAiArtifact, InterviewPrepPayload } from "@/types/api";
import { CreditCostNote, BlockedRunButton } from "@/components/tools/ToolEntitlementGate";

// Accepted resume file types (matches backend allowlist)
const RESUME_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  hasBaseResume: boolean;
  onSuccess:     () => void;
  isBlocked?:   boolean;
  plan?:        string;
}

/**
 * GenericInterviewPrepCard — card-first layout for the Tools page.
 *
 * Generates interview prep from the user's resume + targeting context.
 * Not tied to a specific job — helps the candidate prepare to defend
 * their background, history, and decisions in general.
 *
 * Collapsed by default; expands inline on "Get started".
 * Past runs shown below the header in collapsed state.
 */
export function GenericInterviewPrepCard({ hasBaseResume, onSuccess, isBlocked = false, plan = "REGULAR" }: Props) {
  const [expanded, setExpanded] = useState(false);

  const [targetField,       setTargetField]       = useState("");
  const [targetRolesText,   setTargetRolesText]   = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [resumeFile,        setResumeFile]         = useState<File | null>(null);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [artifact, setArtifact] = useState<UserAiArtifact<InterviewPrepPayload> | null>(null);

  // Bumped after a successful run to trigger PastRunsSection re-fetch
  const [pastRunsKey, setPastRunsKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // At least one targeting field required so the output has direction
  const hasTarget = targetField.trim() || targetRolesText.trim() || additionalContext.trim();
  // Resume is required — base resume or explicit upload
  const canRun    = hasTarget && (hasBaseResume || resumeFile);

  async function handleSubmit() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await aiApi.interviewPrep({
        targetField:       targetField.trim()       || undefined,
        targetRolesText:   targetRolesText.trim()   || undefined,
        additionalContext: additionalContext.trim()  || undefined,
        resumeFile:        resumeFile ?? undefined,
      });
      setArtifact(result);
      setPastRunsKey((k) => k + 1);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const info = TOOL_INFO.GENERIC_INTERVIEW_PREP;

  return (
    <div className="rounded-lg border bg-card">

      {/* ── Card header — always visible ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{info.title}</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prepare to explain and defend your background, experience, and decisions in an interview.
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

      {/* ── Past runs — visible in collapsed state ───────────────────────── */}
      <PastRunsSection kind="INTERVIEW_PREP" refreshKey={pastRunsKey} />

      {/* ── Expanded form ─────────────────────────────────────────────────── */}
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
              {resumeFile ? null : hasBaseResume ? (
                <p className="text-sm text-muted-foreground">
                  Will be using your saved base resume. Or you can{" "}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    upload a different one
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
                  <span className="truncate">{resumeFile.name}</span>
                  <button
                    type="button"
                    className="text-xs hover:text-red-600"
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

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Additional context (optional)
            </label>
            <textarea
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Years of experience, industries, anything else we should consider…"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {isBlocked ? (
            <BlockedRunButton plan={plan} />
          ) : (
            <>
              <Button onClick={handleSubmit} disabled={!canRun || loading} className="w-full mb-2">
                {loading ? "Generating…" : "Generate interview prep"}
              </Button>
              <CreditCostNote plan={plan} cost={3} />
            </>
          )}

          {/* Inline result below the form after a successful run */}
          {artifact && (
            <div className="border-t pt-5">
              <InterviewPrepResult payload={artifact.payload} />
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