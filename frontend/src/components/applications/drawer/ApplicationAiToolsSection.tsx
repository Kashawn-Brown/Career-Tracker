"use client";

import { useEffect, useMemo, useState } from "react";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import { applicationsApi } from "@/lib/api/applications";
import type { Application, AiArtifact, FitV1Payload } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";


type Props = {
  application: Application;
  baseResumeExists: boolean;
  baseResumeId: number | null;

  useOverride: boolean;
  overrideFile: File | null;
  onToggleOverride: (checked: boolean) => void;
  onOverrideFile: (file: File | null) => void;

  onDocumentsChanged?: (applicationId: string) => void;
};

export function ApplicationAiToolsSection({ 
  application, 
  baseResumeExists, 
  baseResumeId, 
  useOverride, 
  overrideFile, 
  onToggleOverride, 
  onOverrideFile, 
  onDocumentsChanged 
}: Props) {

  // FIT artifact
  const [fitArtifact, setFitArtifact] = useState<AiArtifact<FitV1Payload> | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);

  // UI state
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
  
    async function loadLatest() {
      setIsLoadingLatest(true);
      try {
        setErrorMessage(null);
  
        const res = await applicationsApi.listAiArtifacts(application.id, { kind: "FIT_V1" });
        const latest = res?.[0] ?? null;
  
        if (!cancelled) setFitArtifact(latest as AiArtifact<FitV1Payload>);

      } catch (err) {
        if (!cancelled) {
          // don't hard-fail the whole section; just show nothing + a small error
          if (err instanceof ApiError) setErrorMessage(err.message);
          else setErrorMessage("Failed to load latest fit result.");
        }
      } finally {
        if (!cancelled) setIsLoadingLatest(false);
      }
    }
  
    loadLatest();
  
    return () => {
      cancelled = true;
    };
  }, [application.id]);
  

  
  const hasJd = useMemo(() => {
    const jd = application.description?.trim();
    return Boolean(jd && jd.length > 0);
  }, [application.description]);

  // Whether the resume is ready to be used
  const resumeReady = useOverride ? Boolean(overrideFile) : baseResumeExists;
  const isReady = hasJd && resumeReady;


  // Runs the FIT tool
  async function runFit() {
    if (!hasJd) {
      setErrorMessage("Missing job description on this application.");
      return;
    }
  
    // If override is selected, require a file (no silent fallback)
    if (useOverride && !overrideFile) {
      setErrorMessage("Select a file to use for this run (or turn off override).");
      return;
    }
  
    // If override is off, require base resume
    if (!useOverride && !baseResumeExists) {
      setErrorMessage("Upload a Base Resume in Profile (or use an override file).");
      return;
    }
  
    setIsRunning(true);
    setErrorMessage(null);
  
    try {
      let sourceDocumentId: number | undefined = undefined;
  
      // 1) If override, upload CAREER_HISTORY attached to THIS application
      if (useOverride && overrideFile) {
        const uploadRes = await applicationDocumentsApi.upload({
          applicationId: application.id,
          kind: "CAREER_HISTORY",
          file: overrideFile,
        });
  
        const docId = Number(uploadRes.document.id);
        if (!Number.isFinite(docId)) {
          throw new Error("Override upload returned an invalid document id.");
        }
  
        sourceDocumentId = docId;
  
        // Let drawer/table refresh any doc views if needed
        onDocumentsChanged?.(application.id);
      }
  
      // 2) Generate FIT artifact
      const created = await applicationsApi.generateAiArtifact(application.id, {
        kind: "FIT_V1",
        sourceDocumentId,
      });
  
      setFitArtifact(created as AiArtifact<FitV1Payload>);
  
      // Optional: clear override after a successful run (keeps behavior predictable)
      onToggleOverride(false);
      onOverrideFile(null);
  
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to generate fit result.");
    } finally {
      setIsRunning(false);
    }
  }
  


  return (
    <Card className="p-4 space-y-3">
      {/* Error message */}
      {errorMessage ? (
        <div className="relative rounded-md border px-3 py-2 pr-10 text-sm text-destructive">
          {errorMessage}
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="absolute right-2 top-1 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss message"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}


      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Job Compatibility Check</div>
          <div className="text-xs text-muted-foreground">
            Requires Job Description + Candidate History (Base Resume by default).
          </div>
        </div>
      </div>

      {/* Readiness */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span>Job description</span>
          <span className={hasJd ? "text-foreground" : "text-destructive"}>
            {hasJd ? "Ready" : "Missing"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Base Resume</span>
          <span className={baseResumeExists ? "text-foreground" : "text-muted-foreground"}>
            {baseResumeExists ? "Saved" : "Not uploaded"}
          </span>
        </div>
      </div>

      {/* Source selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="ai-use-override"
            type="checkbox"
            checked={useOverride}
            onChange={(e) => {
              onToggleOverride(e.target.checked);
              // Reset file when toggling off to keep behavior predictable
              if (!e.target.checked) onOverrideFile(null);
            }}
          />
          <label htmlFor="ai-use-override" className="text-sm">
            Use a different file for this run
          </label>
        </div>

        {/* Override file input */}
        {useOverride ? (
          <div className="space-y-2">
            <Input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => onOverrideFile(e.target.files?.[0] ?? null)}
            />
            <div className="text-xs text-muted-foreground">
              This file will be uploaded and attached to this application when you run the tool.
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Default: Base Resume (recommended).
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="pt-2 border-t space-y-2">
        <Button
          className="w-full"
          disabled={!isReady || isRunning}
          onClick={runFit}
        >
          {isRunning ? "Running..." : "Run Compatibility"}
        </Button>

        {isLoadingLatest ? (
          <div className="text-xs text-muted-foreground">Loading latest result...</div>
        ) : fitArtifact ? (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Latest result</div>
              <div className="text-xs text-muted-foreground">
                Used doc:{" "}
                {baseResumeId && fitArtifact.sourceDocumentId === baseResumeId
                  ? "Base Resume"
                  : `Doc #${fitArtifact.sourceDocumentId}`}
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="text-3xl font-semibold">
                {fitArtifact.payload.score}
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence: {fitArtifact.payload.confidence}
              </div>
            </div>

            {/* Keep it scan-friendly: only show sections when non-empty */}
            {fitArtifact.payload.strengths?.length ? (
              <div>
                <div className="text-xs font-medium mb-1">Strengths</div>
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {fitArtifact.payload.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            ) : null}

            {fitArtifact.payload.gaps?.length ? (
              <div>
                <div className="text-xs font-medium mb-1">Gaps</div>
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {fitArtifact.payload.gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No fit result yet. Run the tool to generate one.
          </div>
        )}
      </div>

    </Card>
  );
}
