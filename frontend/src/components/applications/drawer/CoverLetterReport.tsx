"use client";

import { useEffect, useState } from "react";
import { Button }   from "@/components/ui/button";
import { X }        from "lucide-react";
import { generateCoverLetterDocx, downloadDocx } from "@/lib/cover-letter-docx";
import type { AiArtifact, CoverLetterPayload } from "@/types/api";

// Mirrors FitReport layout constants
const DRAWER_SELECTOR  = '[data-app-drawer="application-details"]';
const DOCK_PADDING_PX  = 24;
const DOCK_MAX_WIDTH_PX = 960;
const DOCK_MIN_WIDTH_PX = 520;

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  artifact:     AiArtifact<CoverLetterPayload>;
  jobLabel:     string;
};

/**
 * CoverLetterReport — renders the generated cover letter as a non-blocking
 * fixed panel, following the same layout pattern as FitReport.
 *
 * A blur backdrop covers only the area to the left of the drawer so the
 * drawer itself stays interactive while the panel is open.
 */
export function CoverLetterReport({ open, onOpenChange, artifact, jobLabel }: Props) {
  const [dockedStyle,  setDockedStyle]  = useState<React.CSSProperties | undefined>(undefined);
  const [backdropStyle, setBackdropStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [copying,      setCopying]      = useState(false);
  const [downloading,  setDownloading]  = useState(false);

  // Compute panel position relative to the drawer (recalculated on resize)
  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const drawerEl    = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect  = drawerEl?.getBoundingClientRect() ?? null;
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

    // return the date in the format of "January 1, 2025 at 12:00 PM"
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  })();

  function handleCopy() {
    setCopying(true);
    void navigator.clipboard.writeText(p.draft).then(() => {
      setTimeout(() => setCopying(false), 2000);
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await generateCoverLetterDocx(p);
      downloadDocx(blob, `cover-letter-${jobLabel.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.docx`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Blur backdrop — limited to the non-drawer area */}
      <div
        className="hidden lg:block fixed inset-y-0 left-0 z-[55] bg-black/50 backdrop-blur-sm"
        style={backdropStyle}
      />

      {/* Panel — centered vertically, capped height */}
      <div
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60] flex-col max-h-[85vh]"
        style={dockedStyle}
      >
        <div className="rounded-lg border bg-background shadow-lg overflow-hidden flex flex-col max-h-[85vh]">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="border-b px-6 py-4 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-medium">Cover Letter</div>
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

            
          </div>

          {/* ── Scrollable content ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* Primary actions — Download is the main CTA */}
            <div className="flex items-center gap-2 justify-end">
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? "Generating…" : "Download .docx"}
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                {copying ? "Copied!" : "Copy text"}
              </Button>
            </div>

            {/* Draft — the actual letter */}
            <div>
              <div className="text-md font-medium mb-2">Draft</div>
              <div className="rounded-md border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {p.draft}
                </pre>
              </div>
            </div>
          
            {/* Placeholders — shown prominently so user knows what to fill in */}
            {p.placeholders.length > 0 && (
              <div>
                <div className="text-md font-medium mb-2">Placeholders to fill in</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.placeholders.map((ph) => (
                    <span
                      key={ph}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      {ph}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Evidence used */}
            {p.evidence.length > 0 && (
              <SectionList title="Evidence used" items={p.evidence} />
            )}

            {/* Personalization tips — what was "customization notes".
                Renamed because that's what they actually are: tips to
                personalize the draft for this specific application.         */}
            {p.notes.length > 0 && (
              <SectionList title="Personalization tips" items={p.notes} />
            )}
            <div className="text-sm font-medium text-foreground/70 text-center ">
              This is a tailored draft to help you get started. We recommend reviewing it carefully, 
              adding your own voice and specifics, and using the suggestions above as a guide.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}