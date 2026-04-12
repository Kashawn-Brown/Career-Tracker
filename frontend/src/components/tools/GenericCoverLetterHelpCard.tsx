"use client";

import { useRef, useState } from "react";
import { Button }                                              from "@/components/ui/button";
import { CreditCostNote, BlockedRunButton } from "@/components/tools/ToolEntitlementGate";
import { ApiError }          from "@/lib/api/client";
import { aiApi }             from "@/lib/api/ai";
import { CoverLetterResult } from "@/components/tools/CoverLetterResult";
import { ToolInfoPopover }   from "@/components/tools/ToolInfoPopover";
import { TOOL_INFO }         from "@/lib/tool-info";
import { PastRunsSection }   from "@/components/tools/PastRunsSection";
import type { UserAiArtifact, CoverLetterPayload } from "@/types/api";

// Accepted file types — matches backend allowlist
const RESUME_ACCEPT   = ".pdf,.txt,.docx";
const TEMPLATE_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  hasBaseResume:         boolean;
  // Whether the user has a stored base cover letter template — shown as default
  // with an opt-out option so they don't have to re-upload every time.
  baseCoverLetterExists: boolean;
  onSuccess:             () => void;
  isBlocked?:            boolean;
  plan?:                 string;
}

/**
 * GenericCoverLetterHelpCard — card-first layout for the Tools page.
 *
 * Collapsed by default. "Get started" expands the form inline.
 * Template field accepts file upload (.txt or .docx) — text extracted client-side.
 */
export function GenericCoverLetterHelpCard({ hasBaseResume, baseCoverLetterExists, onSuccess, isBlocked = false, plan = "REGULAR" }: Props) {
  // Whether the form is expanded
  const [expanded, setExpanded] = useState(false);

  const [targetField,       setTargetField]       = useState("");
  const [targetRolesText,   setTargetRolesText]   = useState("");
  const [targetCompany,     setTargetCompany]     = useState("");
  const [whyInterested,     setWhyInterested]     = useState("");
  const [motivations,       setMotivations]       = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [resumeFile,        setResumeFile]         = useState<File | null>(null);

  // Template: extracted client-side from the uploaded file
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState("");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  // Bumped after a successful run to trigger PastRunsSection re-fetch
  const [pastRunsKey, setPastRunsKey] = useState(0);

  const [artifact, setArtifact] = useState<UserAiArtifact<CoverLetterPayload> | null>(null);

  // When true, the user has opted out of using their stored base cover letter
  // template for this run. Mirrors the same behaviour in CoverLetterCard.
  const [skipBaseTemplate, setSkipBaseTemplate] = useState(false);

  const resumeInputRef   = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const hasTarget = targetField.trim() || targetRolesText.trim() || targetCompany.trim() || additionalContext.trim();
  const canRun    = hasTarget && (hasBaseResume || resumeFile);

  // Extract text from a template file client-side so we can send it as a string
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

  async function handleSubmit() {
    if (!canRun) return;
    setLoading(true);
    setError(null);

    try {
      const result = await aiApi.coverLetterHelp({
        targetField:                 targetField.trim()       || undefined,
        targetRolesText:             targetRolesText.trim()   || undefined,
        targetCompany:               targetCompany.trim()      || undefined,
        whyInterested:               whyInterested.trim()      || undefined,
        // Merge motivations into additionalContext so the backend receives it
        additionalContext: [motivations.trim(), additionalContext.trim()]
          .filter(Boolean).join("\n\n") || undefined,
        templateText:                templateText.trim()       || undefined,
        resumeFile:                  resumeFile ?? undefined,
        // Only skip the base template when the user opted out AND hasn't
        // supplied their own template (supplying one already overrides it)
        skipBaseCoverLetterTemplate: skipBaseTemplate && !templateFile,
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

  const info = TOOL_INFO.GENERIC_COVER_LETTER;

  return (
    <div className="rounded-lg border bg-card">

      {/* ── Card header — always visible ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{info.title}</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate a reusable cover letter draft tailored to your target direction.
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
      <PastRunsSection kind="COVER_LETTER" refreshKey={pastRunsKey} />

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
              {resumeFile ? (
                null
              ) : hasBaseResume ? (
                <p className="text-sm text-muted-foreground">
                  Will be using your saved base resume. Or you can {" "} 
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={() => resumeInputRef.current?.click()}
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
                    onClick={() => resumeInputRef.current?.click()}
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
                ref={resumeInputRef}
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
                      if (resumeInputRef.current) resumeInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <Field label="Target field / function"           placeholder="e.g. Software Engineering"               value={targetField}       onChange={setTargetField} />
          <Field label="Target roles"                       placeholder="e.g. Backend Engineer, Full Stack"       value={targetRolesText}   onChange={setTargetRolesText} />
          <Field label="Target company (optional)"          placeholder="e.g. Shopify"                            value={targetCompany}     onChange={setTargetCompany} />
          <Field label="Why this type of role? (optional)"  placeholder="What draws you to these kinds of roles?" value={whyInterested}     onChange={setWhyInterested} />

          {/* Motivations — gives the AI personal detail beyond the resume */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your motivations (optional)
            </label>
            <textarea
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="What drives you professionally? What are you looking for in your next role? Any personal context that a resume can't show…"
              value={motivations}
              onChange={(e) => setMotivations(e.target.value)}
            />
          </div>

          <Field label="Additional context (optional)" placeholder="Anything else we should know…" value={additionalContext} onChange={setAdditionalContext} />

          {/* ── Cover letter template ────────────────────────────────────────
               Four states, mirroring CoverLetterCard:
               1. User uploaded a one-off file for this run
               2. Base template saved + not opted out → auto-used, opt-out offered
               3. User opted out → "no template" shown, revert offered
               4. No base template saved → plain upload prompt               */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cover letter template (optional)
            </label>
            <div className="mt-1.5 space-y-1.5 text-sm text-muted-foreground">
              {templateFile ? (
                // 1. User chose a one-off template for this run
                <div>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => templateInputRef.current?.click()}
                  >
                    Using: {templateFile.name}
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs hover:text-red-600"
                    onClick={() => {
                      void handleTemplateFile(null);
                      if (templateInputRef.current) templateInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : baseCoverLetterExists && !skipBaseTemplate ? (
                // 2. Base template is saved and active
                <div>
                  <div>
                    <span className="text-foreground/80">Using: </span>
                    <span className="font-medium text-foreground/80">Base cover letter</span>
                  </div>
                  <div className="mt-1">
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => templateInputRef.current?.click()}
                    >
                      Use a different one
                    </button>
                    {" or "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => setSkipBaseTemplate(true)}
                    >
                      use no template
                    </button>.
                  </div>
                </div>
              ) : skipBaseTemplate && !templateFile ? (
                // 3. User opted out of the base template
                <div>
                  <div>
                    <span className="text-foreground/80">Using: </span>
                    <span className="font-medium text-foreground/80">No template</span>
                  </div>
                  <div className="mt-1">
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => setSkipBaseTemplate(false)}
                    >
                      Use base cover letter
                    </button>
                    {" or "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => templateInputRef.current?.click()}
                    >
                      upload one
                    </button>.
                  </div>
                </div>
              ) : (
                // 4. No base template — plain upload offer
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => templateInputRef.current?.click()}
                >
                  <span className="underline underline-offset-2">
                    Upload an existing cover letter or template to build from
                  </span>
                  <span> (optional)</span>
                </button>
              )}
              <input
                ref={templateInputRef}
                type="file"
                accept={TEMPLATE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  // Uploading a file overrides any skip-opt-out choice
                  setSkipBaseTemplate(false);
                  void handleTemplateFile(e.target.files?.[0] ?? null);
                }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {isBlocked ? (
            <p className="text-xs text-muted-foreground border border-destructive/20 rounded-md bg-destructive/5 px-3 py-2">
              Monthly credit limit reached — this tool is unavailable until your credits reset.{" "}
              <a href="/profile" className="underline underline-offset-2 hover:text-foreground">Request more credits</a>
            </p>
          ) : (
            <>
              <Button onClick={handleSubmit} disabled={!canRun || loading} className="w-full mb-2">
                {loading ? "Generating…" : "Generate cover letter"}
              </Button>
              <CreditCostNote plan={plan} cost={3} />
            </>
          )}

          {artifact && (
            <div className="border-t pt-5">
              <CoverLetterResult payload={artifact.payload} />
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