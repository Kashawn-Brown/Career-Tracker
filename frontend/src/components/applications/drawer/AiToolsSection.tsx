"use client";

import { useMemo, useState } from "react";
import type { Application } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  application: Application;
  baseResumeExists: boolean;

  useOverride: boolean;
  overrideFile: File | null;
  onToggleOverride: (checked: boolean) => void;
  onOverrideFile: (file: File | null) => void;
};

export function AiToolsSection({ application, baseResumeExists, useOverride, overrideFile, onToggleOverride, onOverrideFile }: Props) {
  
  const hasJd = useMemo(() => {
    const jd = application.description?.trim();
    return Boolean(jd && jd.length > 0);
  }, [application.description]);

  const isReady = hasJd && (baseResumeExists || Boolean(overrideFile));

  return (
    <Card className="p-4 space-y-3">
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

        {useOverride ? (
          <div className="space-y-2">
            <Input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => onOverrideFile(e.target.files?.[0] ?? null)}
            />
            <div className="text-xs text-muted-foreground">
              This file will be uploaded and attached to this application when you run a tool.
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Default: Base Resume (recommended).
          </div>
        )}
      </div>

      {/* Tool placeholder (disabled for E0) */}
      <div className="pt-2 border-t space-y-2">
        <Button disabled className="w-full">
          Fit / Compatibility (coming next)
        </Button>
        <div className="text-xs text-muted-foreground">
          {isReady
            ? "You’re ready to run tools once enabled."
            : "Upload a Base Resume in Profile, and ensure the Job Description is present."}
        </div>
      </div>
    </Card>
  );
}
