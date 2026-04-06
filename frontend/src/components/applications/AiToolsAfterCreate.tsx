"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AiToolSelections } from "@/hooks/useAiToolsOnCreate";

const RESUME_ACCEPT   = ".pdf,.txt,.docx";
const TEMPLATE_ACCEPT = ".pdf,.txt,.docx";

interface Props {
  // Main toggle — whether the user wants to run AI tools after create
  enabled:          boolean;
  onEnabledChange:  (v: boolean) => void;

  // Which tools to run — persisted to localStorage by the parent hook
  selections:       AiToolSelections;
  onSelectionsChange: (s: AiToolSelections) => void;

  // Base document availability — determines defaults and fallback prompts
  baseResumeExists:      boolean;
  baseCoverLetterExists: boolean;

  // Override resume — uploaded once and reused across all selected tools
  overrideFile:         File | null;
  onOverrideFileChange: (f: File | null) => void;

  // Cover letter template — optional, extracted to text by the parent form
  templateFile:         File | null;
  onTemplateFileChange: (f: File | null) => void;

  disabled?: boolean;
}

/**
 * AiToolsAfterCreate — toggle + collapsible settings panel shown at the
 * bottom of both create forms.
 *
 * When the toggle goes from off → on, the settings panel auto-opens so the
 * user can immediately review or adjust the defaults. After that, the panel
 * can be collapsed/expanded independently of the toggle state.
 */
export function AiToolsAfterCreate({
  enabled,
  onEnabledChange,
  selections,
  onSelectionsChange,
  baseResumeExists,
  baseCoverLetterExists,
  overrideFile,
  onOverrideFileChange,
  templateFile,
  onTemplateFileChange,
  disabled = false,
}: Props) {
  // Settings panel open/close — independent of the toggle once it's been opened
  const [settingsOpen, setSettingsOpen] = useState(false);

  const resumeInputRef   = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Any tool must be selected for the toggle to be meaningful
  const anySelected = selections.fit || selections.resumeAdvice || selections.coverLetter;

  return (
    <div className="space-y-2">

      {/* ── Main toggle row ─────────────────────────────────────────────── */}
      <div className="flex items-center">
        <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              const next = e.target.checked;
              if (next && !enabled) setSettingsOpen(true);
              onEnabledChange(next);
            }}
            disabled={disabled}
            className="h-4 w-4"
          />
          Run AI tools after creation
        </label>

        {/* Settings chevron — only shown when toggle is on */}
        {enabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex items-center text-xs text-muted-foreground hover:text-foreground"
          >
            {settingsOpen
              ? <ChevronDown  className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
            Settings
          </button>
        )}
      </div>

      {/* ── Collapsed settings panel ─────────────────────────────────────── */}
      {enabled && settingsOpen && (
        <div className="rounded-md border p-3 space-y-4 text-sm">

          {/* ── Tool selection ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI tools to run:
            </div>

            {(["fit", "resumeAdvice", "coverLetter"] as const).map((key) => {
              const labels: Record<typeof key, string> = {
                fit:          "Compatibility check",
                resumeAdvice: "Tailored resume advice",
                coverLetter:  "Cover letter generation (draft)",
              };
              return (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selections[key]}
                    disabled={disabled}
                    onChange={(e) =>
                      onSelectionsChange({ ...selections, [key]: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span>{labels[key]}</span>
                </label>
              );
            })}

            {/* Warn if nothing is selected while toggle is on */}
            {!anySelected && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Select at least one tool, or turn off the toggle above.
              </p>
            )}
          </div>

          {/* ── Resume source ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resume
            </div>

            {overrideFile ? (
              // User uploaded a one-off resume for this run
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="truncate">{overrideFile.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  className="text-xs hover:text-red-600 shrink-0"
                  onClick={() => {
                    onOverrideFileChange(null);
                    if (resumeInputRef.current) resumeInputRef.current.value = "";
                  }}
                >
                  ✕
                </button>
              </div>
            ) : baseResumeExists ? (
              // Default — use the saved base resume
              <div className="text-muted-foreground">
                <span className="text-foreground/80">Using: </span>
                <span className="font-medium text-foreground/80">Base resume</span>
                <div className="mt-0.5">
                  <button
                    type="button"
                    disabled={disabled}
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => resumeInputRef.current?.click()}
                  >
                    Use a different one
                  </button>
                </div>
              </div>
            ) : (
              // No base resume — must upload
              <div className="text-amber-600 dark:text-amber-400">
                No base resume saved.{" "}
                <button
                  type="button"
                  disabled={disabled}
                  className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200"
                  onClick={() => resumeInputRef.current?.click()}
                >
                  Upload one to continue
                </button>
                {" or "}
                <a href="/profile" className="underline underline-offset-2">
                  add one to your profile
                </a>.
              </div>
            )}

            <input
              ref={resumeInputRef}
              type="file"
              accept={RESUME_ACCEPT}
              className="hidden"
              onChange={(e) => onOverrideFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* ── Cover letter template (only relevant when cover letter selected) ── */}
          {selections.coverLetter && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cover letter template
              </div>

              {templateFile ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="truncate">{templateFile.name}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-xs hover:text-red-600 shrink-0"
                    onClick={() => {
                      onTemplateFileChange(null);
                      if (templateInputRef.current) templateInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : baseCoverLetterExists ? (
                <div className="text-muted-foreground">
                  <span className="text-foreground/80">Using: </span>
                  <span className="font-medium text-foreground/80">Base cover letter</span>
                  <div className="mt-0.5">
                    <button
                      type="button"
                      disabled={disabled}
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => templateInputRef.current?.click()}
                    >
                      Use a different one
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => templateInputRef.current?.click()}
                >
                  <span className="underline underline-offset-2">
                    Upload a template to build from
                  </span>
                  <span className="text-xs"> (optional)</span>
                </button>
              )}

              <input
                ref={templateInputRef}
                type="file"
                accept={TEMPLATE_ACCEPT}
                className="hidden"
                onChange={(e) => onTemplateFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}