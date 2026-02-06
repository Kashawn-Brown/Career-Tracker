"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AiArtifact, FitV1Payload } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import type { FitBand } from "@/lib/fit/presentation";

// Selector for the application details drawer
const DRAWER_SELECTOR = '[data-app-drawer="application-details"]';

// Layout tuning
const DOCK_PADDING_PX = 24;     // desired breathing room from edges
const DOCK_MAX_WIDTH_PX = 960;  // cap modal width on big screens
const DOCK_MIN_WIDTH_PX = 520;  // minimum width before overlap is allowed

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: AiArtifact<FitV1Payload>;
  band: FitBand;
  usedDocLabel: string;

  jobLabel: string;
};

// List of sections
function SectionList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function FitReportDialog({ open, onOpenChange, artifact, band, usedDocLabel, jobLabel }: Props) {

  // Docking style for the dialog
  const [dockedStyle, setDockedStyle] = useState<React.CSSProperties | undefined>(undefined);

  // Compute the docking style for the dialog
  useEffect(() => {
    if (!open) return;
  
    const compute = () => {
      const drawerEl = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect = drawerEl?.getBoundingClientRect() ?? null;
  
      // Space available to the left of the drawer (or full viewport if not found)
      const availableWidth = drawerRect ? drawerRect.left : window.innerWidth;
  
      // Center point in that available region
      const centerX = Math.max(availableWidth / 2, DOCK_PADDING_PX);
  
      // Prefer shrinking to fit the available region; once too small, keep a min width (overlap allowed)
      const preferredMax = Math.min(
        DOCK_MAX_WIDTH_PX,
        Math.max(availableWidth - DOCK_PADDING_PX * 2, 0)
      );
  
      const maxWidth = Math.max(preferredMax, DOCK_MIN_WIDTH_PX);
  
      setDockedStyle({
        left: `${centerX}px`,
        maxWidth: `${maxWidth}px`,
      });
    };
  
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);
  

  const p = artifact.payload;

  const createdAtLabel = (() => {
    const d = new Date(artifact.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto" style={dockedStyle}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">Compatibility Report</DialogTitle>
          <DialogDescription>
            <span className="text-md font-medium text-foreground">{jobLabel}</span>
            <br/>
            <span>Latest run: </span>{" "} {createdAtLabel ?? "Unknown"}
            {"  •  "}
            <span>Document used: </span> {" "} {usedDocLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Top summary */}
        <div className={cn("rounded-md border p-4 border-l-4 mt-4 mb-4", band.stripeClass)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-semibold">
                  {p.score}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    band.badgeClass
                  )}
                >
                  {band.label}
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Confidence: <span className="text-foreground">{p.confidence}</span>
              </div>
            </div>
          </div>

          {/* Drawer-style summaries (first items) */}
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
        <div className="space-y-6">
          <SectionList title="Strengths" items={p.strengths?.slice(1)} />
          <SectionList title="Gaps" items={p.gaps?.slice(1)} />
          <SectionList title="Keyword gaps" items={p.keywordGaps} />
          <SectionList title="Recommended resume edits" items={p.recommendedEdits} />
          <SectionList title="Questions to ask the employer" items={p.questionsToAsk} />
        </div>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
