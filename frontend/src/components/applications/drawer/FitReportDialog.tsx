"use client";

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

export type FitBand = {
  label: string;
  stripeClass: string;
  badgeClass: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: AiArtifact<FitV1Payload>;
  band: FitBand;
  usedDocLabel: string;
};

function SectionList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function FitReportDialog({ open, onOpenChange, artifact, band, usedDocLabel }: Props) {
  const p = artifact.payload;

  const createdAtLabel = (() => {
    const d = new Date(artifact.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compatibility Report</DialogTitle>
          <DialogDescription>
            {createdAtLabel ? `Latest run: ${createdAtLabel} • ` : ""}
            Used: {usedDocLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Top summary */}
        <div className={cn("rounded-md border p-4 border-l-4", band.stripeClass)}>
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
          <SectionList title="Strengths" items={p.strengths} />
          <SectionList title="Gaps" items={p.gaps} />
          <SectionList title="Keyword gaps" items={p.keywordGaps} />
          <SectionList title="Recommended resume edits" items={p.recommendedEdits} />
          <SectionList title="Questions to ask the employer" items={p.questionsToAsk} />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
