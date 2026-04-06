"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AiArtifact } from "@/types/api";

const DRAWER_SELECTOR   = '[data-app-drawer="application-details"]';
const DOCK_PADDING_PX   = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

/**
 * Legacy Resume Advice v1 payload shape — used by artifacts generated before the v2 redesign.
 * v1 had improvements and tailoring instead of improvements and roleAlignment.
 * Kept here so old results still render cleanly rather than showing blank sections.
 */
type ResumeAdviceV1LegacyPayload = {
  summary?:      string;
  strengths?:    string[];
  improvements?: string[];
  tailoring?:    string[];
  rewrites?:     string[];
  keywords?:     string[];
};

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  artifact:     AiArtifact<ResumeAdviceV1LegacyPayload>;
  jobLabel:     string;
};

function SectionList({ title, items, accent }: {
  title:  string;
  items?: string[];
  accent: "green" | "amber" | "blue" | "purple";
}) {
  if (!items?.length) return null;

  const dotColor = {
    green:  "bg-green-500",
    amber:  "bg-amber-500",
    blue:   "bg-blue-500",
    purple: "bg-purple-500",
  }[accent];

  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ResumeAdviceReportLegacy — renders resume advice generated before the v2 shape.
 * Shown when "tailoring" is present in the artifact payload (v1 signal).
 */
export function ResumeAdviceReportLegacy({ open, onOpenChange, artifact, jobLabel }: Props) {
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
        className="hidden lg:block fixed inset-y-0 left-0 z-[55] bg-black/50 backdrop-blur-sm"
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {p.summary && (
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">{p.summary}</p>
            )}

            <SectionList title="Strengths"             items={p.strengths}    accent="green"  />
            <SectionList title="Areas to improve"      items={p.improvements} accent="amber"  />
            <SectionList title="Tailoring suggestions" items={p.tailoring}    accent="blue"   />
            <SectionList title="Rewrite suggestions"   items={p.rewrites}     accent="purple" />

            {p.keywords && p.keywords.length > 0 && (
              <div>
                <div className="text-md font-medium mb-2">Missing Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.keywords.map((kw) => (
                    <span key={kw} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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