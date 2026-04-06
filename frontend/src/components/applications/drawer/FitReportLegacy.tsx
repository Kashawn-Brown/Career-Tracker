"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiArtifact } from "@/types/api";
import type { FitBand } from "@/lib/fit/presentation";

// Mirrors FitReport layout constants
const DRAWER_SELECTOR   = '[data-app-drawer="application-details"]';
const DOCK_PADDING_PX   = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

/**
 * Legacy Fit v1 payload shape — used by artifacts generated before the v2 redesign.
 * v1 had recommendedEdits and questionsToAsk instead of roleSignals and prepAreas.
 * Kept here so old results still render cleanly rather than showing blank sections.
 */
type FitV1LegacyPayload = {
  score:            number;
  fitSummary?:      string;
  strengths?:       string[];
  gaps?:            string[];
  keywordGaps?:     string[];
  recommendedEdits?: string[];
  questionsToAsk?:  string[];
};

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  artifact:     AiArtifact<FitV1LegacyPayload>;
  band:         FitBand;
  usedDocLabel: string;
  jobLabel:     string;
};

function SectionList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

/**
 * FitReportLegacy — renders compatibility reports generated before the v2 shape.
 * Shown when "recommendedEdits" is present in the artifact payload (v1 signal).
 */
export function FitReportLegacy({ open, onOpenChange, artifact, band, usedDocLabel, jobLabel }: Props) {
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

  const p = artifact.payload;

  const createdAtLabel = (() => {
    const d = new Date(artifact.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  })();

  return (
    <>
      <div
        className="hidden lg:block fixed inset-y-0 left-0 z-[55] bg-black/50 backdrop-blur-sm mb-0"
        style={backdropStyle}
      />

      <div
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60] flex-col max-h-[85vh]"
        style={dockedStyle}
      >
        <div className="rounded-lg border bg-background shadow-lg overflow-hidden flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="border-b px-6 py-4 shrink-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-medium">Compatibility Report</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{jobLabel}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {createdAtLabel ?? "Unknown"}{" • "}{usedDocLabel}
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
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* Score + summary */}
            <div className={cn("rounded-md border p-4 border-l-4", band.stripeClass)}>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-semibold">
                  {p.score}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </div>
                <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", band.badgeClass)}>
                  {band.label}
                </div>
              </div>
              {p.fitSummary && (
                <div className="mt-3 text-sm text-muted-foreground">{p.fitSummary}</div>
              )}
            </div>

            <SectionList title="Strengths"                     items={p.strengths} />
            <SectionList title="Gaps"                          items={p.gaps} />
            <SectionList title="Keyword gaps"                  items={p.keywordGaps} />
            <SectionList title="Recommended resume edits"      items={p.recommendedEdits} />
            <SectionList title="Questions to ask the employer" items={p.questionsToAsk} />

          </div>
        </div>
      </div>
    </>
  );
}