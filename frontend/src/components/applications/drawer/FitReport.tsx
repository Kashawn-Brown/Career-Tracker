"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AiArtifact, FitV1Payload } from "@/types/api";
import type { FitBand } from "@/lib/fit/presentation";
import { X } from "lucide-react";

// Selector for the application details drawer
const DRAWER_SELECTOR = '[data-app-drawer="application-details"]';

// Layout tuning — mirrors document preview constants
const DOCK_PADDING_PX  = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: AiArtifact<FitV1Payload>;
  band: FitBand;
  usedDocLabel: string;
  jobLabel: string;
};

// ─── SectionList ──────────────────────────────────────────────────────────────

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

// ─── FitReport ────────────────────────────────────────────────────────────────

/**
 * Renders the compatibility report as a non-blocking fixed panel.
 *
 * A blur backdrop covers only the area to the left of the drawer so the
 * backdrop feel is preserved without blocking drawer interaction.
 * The panel itself is centered vertically at a capped height (like a dialog)
 * rather than stretching full height (like the document preview).
 */
export function FitReport({
  open,
  onOpenChange,
  artifact,
  band,
  usedDocLabel,
  jobLabel,
}: Props) {
  const [dockedStyle, setDockedStyle]     = useState<React.CSSProperties | undefined>(undefined);
  const [backdropStyle, setBackdropStyle] = useState<React.CSSProperties | undefined>(undefined);

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const drawerEl   = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect = drawerEl?.getBoundingClientRect() ?? null;

      // Width of the area left of the drawer (or full viewport)
      const availableWidth = drawerRect ? drawerRect.left : window.innerWidth;
      const centerX        = Math.max(availableWidth / 2, DOCK_PADDING_PX);

      const preferredMax = Math.min(
        DOCK_MAX_WIDTH_PX,
        Math.max(availableWidth - DOCK_PADDING_PX * 2, 0)
      );
      const panelWidth = Math.max(preferredMax, DOCK_MIN_WIDTH_PX);

      // Panel: centered horizontally in the available region, auto height capped at 80vh
      setDockedStyle({
        left:     `${centerX}px`,
        width:    `${panelWidth}px`,
        maxWidth: `${panelWidth}px`,
      });

      // Backdrop: only covers the area to the left of the drawer
      setBackdropStyle({
        right: `${window.innerWidth - availableWidth}px`,
      });
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
    return d.toLocaleString();
  })();

  return (
    <>
      {/* Blur backdrop — limited to the non-drawer area so drawer stays interactive */}
      <div
        className="hidden lg:block fixed inset-y-0 left-0 z-[55] bg-black/50 backdrop-blur-sm mb-0"
        style={backdropStyle}
      />

      {/* Panel — centered vertically, capped height like original dialog */}
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
                {createdAtLabel ?? "Unknown"}
                {" • "}
                {usedDocLabel}
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

            {/* Top summary */}
            <div className={cn("rounded-md border p-4 border-l-4", band.stripeClass)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-semibold">
                      {p.score}
                      <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                    </div>
                    <div className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      band.badgeClass
                    )}>
                      {band.label}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Confidence: <span className="text-foreground">{p.confidence}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {p.strengths?.[0] ? (
                  <div>
                    <div className="text-sm font-medium">Strengths summary</div>
                    <div className="text-sm text-muted-foreground mt-1">{p.strengths[0]}</div>
                  </div>
                ) : null}
                {p.gaps?.[0] ? (
                  <div>
                    <div className="text-sm font-medium">Gaps summary</div>
                    <div className="text-sm text-muted-foreground mt-1">{p.gaps[0]}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Full sections */}
            <SectionList title="Strengths"                     items={p.strengths?.slice(1)} />
            <SectionList title="Gaps"                          items={p.gaps?.slice(1)} />
            <SectionList title="Keyword gaps"                  items={p.keywordGaps} />
            <SectionList title="Recommended resume edits"      items={p.recommendedEdits} />
            <SectionList title="Questions to ask the employer" items={p.questionsToAsk} />

          </div>

        </div>
      </div>
    </>
  );
}