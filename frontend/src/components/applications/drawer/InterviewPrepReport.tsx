"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AiArtifact, InterviewPrepPayload } from "@/types/api";
import { InterviewPrepResult } from "@/components/tools/InterviewPrepResult";

// Mirrors layout constants from FitReport / ResumeAdviceReport
const DRAWER_SELECTOR   = '[data-app-drawer="application-details"]';
const DOCK_PADDING_PX   = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

type Props = {
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  artifact:         AiArtifact<InterviewPrepPayload>;
  jobLabel:         string;
  sourceDocLabel?:  string; // e.g. "Base resume" or "resume.pdf"
};

/**
 * InterviewPrepReport — full panel for a targeted interview prep artifact.
 *
 * Non-blocking fixed panel — same layout pattern as FitReport and ResumeAdviceReport.
 * Renders InterviewPrepResult so the full result is visible without scrolling the drawer.
 */
export function InterviewPrepReport({ open, onOpenChange, artifact, jobLabel, sourceDocLabel }: Props) {
  const [dockedStyle,   setDockedStyle]   = useState<React.CSSProperties | undefined>(undefined);
  const [backdropStyle, setBackdropStyle] = useState<React.CSSProperties | undefined>(undefined);

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const drawerEl       = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect     = drawerEl?.getBoundingClientRect() ?? null;
      const availableWidth = drawerRect ? drawerRect.left : window.innerWidth;
      const centerX        = Math.max(availableWidth / 2, DOCK_PADDING_PX);
      const preferredMax   = Math.min(DOCK_MAX_WIDTH_PX, Math.max(availableWidth - DOCK_PADDING_PX * 2, 0));
      const panelWidth     = Math.max(preferredMax, DOCK_MIN_WIDTH_PX);

      setDockedStyle({ left: `${centerX}px`, width: `${panelWidth}px`, maxWidth: `${panelWidth}px` });
      setBackdropStyle({ right: `${window.innerWidth - availableWidth}px` });
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  if (!open) return null;

  const createdAtLabel = (() => {
    const d = new Date(artifact.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  })();

  return (
    <>
      {/* Blur backdrop — limited to the non-drawer area */}
      <div
        className="hidden lg:block fixed inset-y-0 left-0 z-[55] bg-black/50 backdrop-blur-sm"
        style={backdropStyle}
      />

      {/* Panel */}
      <div
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60] flex-col max-h-[85vh]"
        style={dockedStyle}
      >
        <div className="rounded-lg border bg-background shadow-lg overflow-hidden flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="border-b px-6 py-4 shrink-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-medium">Interview Prep</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{jobLabel}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {createdAtLabel ?? "Unknown"}
                {sourceDocLabel && ` • ${sourceDocLabel}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring shrink-0 mt-1"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <InterviewPrepResult payload={artifact.payload} />
          </div>

        </div>
      </div>
    </>
  );
}