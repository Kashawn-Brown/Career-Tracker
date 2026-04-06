"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AiArtifact, ResumeAdvicePayload } from "@/types/api";
import { ResumeAdviceReportLegacy } from "@/components/applications/drawer/ResumeAdviceReportLegacy";

// Mirrors FitReport layout constants
const DRAWER_SELECTOR   = '[data-app-drawer="application-details"]';
const DOCK_PADDING_PX   = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  artifact:     AiArtifact<ResumeAdvicePayload>;
  jobLabel:     string;
};

// Legacy Resume Advice v1 payload shape — used by artifacts generated before the v2 redesign.
type ResumeAdviceV1LegacyPayload = {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  tailoring?: string[];
  rewrites?: string[];
  keywords?: string[];
};

/**
 * ResumeAdviceReport — renders the resume advice result as a non-blocking
 * fixed panel, following the same layout pattern as FitReport and CoverLetterReport.
 */
export function ResumeAdviceReport({ open, onOpenChange, artifact, jobLabel }: Props) {
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

  // Route legacy v1 artifacts (pre-v2) to the legacy renderer.
  // v1 is identified by the presence of "tailoring" which was removed in v2.
  if ("tailoring" in artifact.payload) {
    return (
      <ResumeAdviceReportLegacy
        open={open}
        onOpenChange={onOpenChange}
        artifact={artifact as AiArtifact<ResumeAdviceV1LegacyPayload>}
        jobLabel={jobLabel}
      />
    );
  }

  if (!open) return null;

  const p = artifact.payload;

  const createdAtLabel = (() => {
    const d = new Date(artifact.createdAt);

    // return the date in the format of "Jan 1, 2025 at 12:00 PM"
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
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

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="border-b px-6 py-4 shrink-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-medium">Resume Advice</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{jobLabel}</div>
              {createdAtLabel && (
                <div className="text-xs text-muted-foreground mt-1">{createdAtLabel}</div>
              )}
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

          {/* ── Scrollable content ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* Summary — gives a quick sense of what the advice covers */}
            <p className="text-sm text-foreground/80 leading-relaxed font-medium">{p.summary}</p>

            {/* Sections — empty arrays show a brief positive note so the candidate
                knows the tool evaluated that area and found nothing to flag.      */}
            <SectionList
              title="What's working"
              items={p.strengths}
              accent="green"
              emptyMessage="No clear standout strengths identified — consider adding more specific achievements."
            />
            <SectionList
              title="Areas to improve"
              items={p.improvements}
              accent="amber"
              emptyMessage="Nothing significant flagged — resume reads clearly and specifically."
            />
            <SectionList
              title="How to better align with the role"
              items={p.roleAlignment}
              accent="blue"
              emptyMessage="Resume already aligns well with the target role — no major shifts needed."
            />
            <SectionList
              title="Possible rewrite suggestions"
              items={p.rewrites}
              accent="purple"
              emptyMessage="No specific rewrites flagged — bullets are clear and well-framed."
            />

            {p.keywords.length > 0 && (
              <div>
                <div className="text-md font-medium mb-2">Missing Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// Coloured dot list — same visual language as the inline ResumeAdviceResult component
/**
 * SectionList — coloured-dot list with optional empty-state message.
 * Shows emptyMessage (muted italic) instead of hiding the section when items
 * is empty, so the candidate knows the tool evaluated that area.
 */
function SectionList({
  title, items, accent, emptyMessage,
}: {
  title:         string;
  items:         string[];
  accent:        "green" | "amber" | "blue" | "purple";
  emptyMessage?: string;
}) {
  const dotColor = {
    green:  "bg-green-500",
    amber:  "bg-amber-500",
    blue:   "bg-blue-500",
    purple: "bg-purple-500",
  }[accent];

  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : emptyMessage ? (
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      ) : null}
    </div>
  );
}