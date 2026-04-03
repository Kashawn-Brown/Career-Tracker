"use client";

import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  key:   string;
  label: string;
}

interface Props {
  steps:       Step[];
  activeIndex: number;
  onCancel:    () => void;
}

/**
 * ToolRunProgress — shared in-flight progress UI for all three AI tool cards.
 *
 * Accepts the same steps + activeIndex shape produced by both useFitRuns and
 * useDocumentToolRuns, so Compatibility Check, Resume Advice, and Cover Letter
 * all render an identical loading experience.
 *
 * Layout:
 *   - Spinner + active step label + "Step X of Y" counter
 *   - Animated progress bar (width tied to step index)
 *   - Step checklist (done / active / pending icons) — hidden for single-step runs
 *   - Cancel button
 */
export function ToolRunProgress({ steps, activeIndex, onCancel }: Props) {
  const activeLabel  = steps[activeIndex]?.label ?? "Working…";
  const progressPct  = steps.length > 0
    ? Math.round(((activeIndex + 1) / steps.length) * 100)
    : 50;

  return (
    <div className="rounded-md border p-3 space-y-3">

      {/* Spinner + active label + step counter */}
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{activeLabel}</div>
          <div className="text-xs text-muted-foreground">
            Step {Math.min(activeIndex + 1, steps.length)} of {steps.length}
          </div>
        </div>
      </div>

      {/* Progress bar — width reflects actual step progress */}
      <div className="h-1.5 w-full rounded bg-muted">
        <div
          className="h-1.5 rounded bg-primary transition-all animate-pulse"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Step checklist — only shown for multi-step runs */}
      {steps.length > 1 && (
        <div className="space-y-1.5 text-sm">
          {steps.map((step, idx) => {
            const isDone   = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <div key={step.key} className="flex items-center gap-2">
                {isDone
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : isActive
                    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    : <Circle className="h-4 w-4 shrink-0 opacity-40" />}
                <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

    </div>
  );
}