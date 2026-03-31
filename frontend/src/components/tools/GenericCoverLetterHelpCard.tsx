"use client";

import { useRef, useState } from "react";
import { Button }           from "@/components/ui/button";
import { ApiError }         from "@/lib/api/client";
import { aiApi }            from "@/lib/api/ai";
import { CoverLetterResult } from "@/components/tools/CoverLetterResult";
import type { UserAiArtifact, CoverLetterPayload } from "@/types/api";

interface Props {
  hasBaseResume: boolean;
  onSuccess: () => void;
}

export function GenericCoverLetterHelpCard({ hasBaseResume, onSuccess }: Props) {
  const [targetField,       setTargetField]       = useState("");
  const [targetRolesText,   setTargetRolesText]   = useState("");
  const [targetCompany,     setTargetCompany]     = useState("");
  const [whyInterested,     setWhyInterested]     = useState("");
  const [templateText,      setTemplateText]      = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [resumeFile,        setResumeFile]         = useState<File | null>(null);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [artifact, setArtifact] = useState<UserAiArtifact<CoverLetterPayload> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasTarget = targetField.trim() || targetRolesText.trim() || targetCompany.trim() || additionalContext.trim();
  const canRun    = hasTarget && (hasBaseResume || resumeFile);

  async function handleSubmit() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await aiApi.coverLetterHelp({
        targetField:       targetField.trim()       || undefined,
        targetRolesText:   targetRolesText.trim()   || undefined,
        targetCompany:     targetCompany.trim()      || undefined,
        whyInterested:     whyInterested.trim()      || undefined,
        templateText:      templateText.trim()       || undefined,
        additionalContext: additionalContext.trim()  || undefined,
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

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-foreground">Cover Letter Help</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate a reusable cover letter draft tailored to your target direction.
        </p>
      </div>

      <div className="space-y-3">
        {/* Resume source */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Resume
          </label>
          <div className="mt-1.5 space-y-1.5">
            {hasBaseResume && (
              <p className="text-sm text-muted-foreground">
                Using your saved base resume.{" "}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload a different one
                </button>{" "}
                for this run.
              </p>
            )}
            {!hasBaseResume && (
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
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            {resumeFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{resumeFile.name}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <Field label="Target field / function"  placeholder="e.g. Software Engineering"           value={targetField}       onChange={setTargetField} />
        <Field label="Target roles"             placeholder="e.g. Backend Engineer, Full Stack"   value={targetRolesText}   onChange={setTargetRolesText} />
        <Field label="Target company (optional)" placeholder="e.g. Shopify"                       value={targetCompany}     onChange={setTargetCompany} />
        <Field label="Why interested (optional)" placeholder="What draws you to this type of role?" value={whyInterested}   onChange={setWhyInterested} />
        <Field label="Additional context (optional)" placeholder="Anything else the we should know…" value={additionalContext} onChange={setAdditionalContext} />

        {/* Template */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Template (optional)
          </label>
          <textarea
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={4}
            placeholder="Paste a cover letter template or structure you'd like us to follow…"
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canRun || loading}
        className="w-full"
      >
        {loading ? "Generating…" : "Generate cover letter"}
      </Button>

      {artifact && (
        <div className="border-t pt-5">
          <CoverLetterResult payload={artifact.payload} />
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