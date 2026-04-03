"use client";

import { useMemo } from "react";
import type { Application } from "@/types/api";
import type { FitRunsController } from "@/hooks/useFitRuns";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import { useAuth } from "@/hooks/useAuth";
import { ProAccessBanner }  from "@/components/pro/ProAccessBanner";
import { RequestProDialog } from "@/components/pro/RequestProDialog";
import { CompatibilityCheckCard } from "@/components/applications/drawer/CompatibilityCheckCard";
import { ResumeAdviceCard }       from "@/components/applications/drawer/ResumeAdviceCard";
import { CoverLetterCard }        from "@/components/applications/drawer/CoverLetterCard";
import { canUseAi, getRemainingAiCredits, hasProPlan, getEffectivePlan } from "@/lib/plans";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

// Props for the ApplicationAiToolsSection component
type Props = {
  drawerOpen:  boolean;
  application: Application;
  fitRuns:          FitRunsController;
  documentToolRuns: DocumentToolRunsController;

  baseResumeExists:      boolean;
  baseResumeId:          number | null;
  baseCoverLetterExists: boolean;

  onDocumentsChanged?:   (applicationId: string) => void;
  onApplicationChanged?: (applicationId: string) => void;

  autoOpenLatestFit?:          boolean;
  onAutoOpenLatestFitConsumed?: () => void;

  // Incremented by the drawer when a document is uploaded so all AI tool
  // resume pickers re-fetch without needing a full drawer close/reopen.
  docsReloadKey?: number;

  // Panel manager callbacks — provided by the drawer via usePanelManager.
  // Each card is given a curried version with its own unique panel ID so the
  // registry can close cards individually without them knowing each other.
  registerPanel: (id: string, closeFn: () => void) => void;
  closeOthers:   (exceptId: string) => void;
};

/**
 * ApplicationAiToolsSection — orchestrates all AI tool cards for a single application.
 *
 * Responsibilities:
 *  - Shows a shared status bar (JD + base resume) visible across all tools
 *  - Renders the ProAccessBanner (applies to all tools, not just Fit)
 *  - Delegates tool-specific logic to CompatibilityCheckCard, ResumeAdviceCard, CoverLetterCard
 *  - Curries panel manager callbacks per card so each registers under its own ID
 */
export function ApplicationAiToolsSection({
  drawerOpen,
  application,
  fitRuns,
  documentToolRuns,
  baseResumeExists,
  baseResumeId,
  baseCoverLetterExists,
  onDocumentsChanged,
  onApplicationChanged,
  autoOpenLatestFit,
  onAutoOpenLatestFitConsumed,
  docsReloadKey = 0,
  registerPanel,
  closeOthers,
}: Props) {
  // Auth and plan state live here so they can be shared across all three cards
  const { user, aiProRequest, refreshMe } = useAuth();
  const canUse             = user ? canUseAi(user) : false;
  const remainingAiCredits = user ? getRemainingAiCredits(user) : 0;
  const isPro              = user ? hasProPlan(getEffectivePlan(user)) : false;

  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  // Shared derived state used by the status bar and passed to cards
  const hasJd = useMemo(
    () => Boolean(application.description?.trim()),
    [application.description]
  );

  return (
    <div className="space-y-3">

      {/* ── Shared ProAccess banner ─────────────────────────────────────────
           Shown once at the top — applies to all tools in this section.    */}
      <ProAccessBanner
        isPro={isPro}
        remainingAiCredits={remainingAiCredits ?? 0}
        canUseAi={canUse}
        aiProRequest={aiProRequest}
        onRequestPro={() => setIsProDialogOpen(true)}
      />
      <RequestProDialog
        open={isProDialogOpen}
        onOpenChange={setIsProDialogOpen}
        onRequested={() => refreshMe()}
      />

      {/* ── Shared readiness status bar ─────────────────────────────────────
           Sits outside all Cards so it reads as section-level context,
           not as part of any individual tool.                               */}
      <div className="flex items-center gap-4 rounded-md border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={hasJd ? "text-green-600 dark:text-green-400" : "text-destructive"}>●</span>
          <span className="text-muted-foreground">
            Job description:{" "}
            <span className={hasJd ? "text-foreground" : "text-destructive font-medium"}>
              {hasJd ? "Ready" : "Missing"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={baseResumeExists ? "text-green-600 dark:text-green-400" : "text-destructive"}>●</span>
          <span className="text-muted-foreground">
            Base resume:{" "}
            <span className={baseResumeExists ? "text-foreground" : "text-destructive font-medium"}>
              {baseResumeExists ? "Saved" : "None"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={baseCoverLetterExists ? "text-green-600 dark:text-green-400" : "text-destructive"}>●</span>
          <span className="text-muted-foreground">
            Base cover letter:{" "}
            <span className={baseCoverLetterExists ? "text-foreground" : "text-destructive font-medium"}>
              {baseCoverLetterExists ? "Saved" : "None"}
            </span>
          </span>
        </div>
      </div>

      {/* ── Tool cards ──────────────────────────────────────────────────── */}
      {/* Each card gets its own panel ID curried in so the registry can     */}
      {/* target it individually without cards needing to know each other.   */}

      <CompatibilityCheckCard
        drawerOpen={drawerOpen}
        application={application}
        fitRuns={fitRuns}
        baseResumeExists={baseResumeExists}
        baseResumeId={baseResumeId}
        canUseAi={canUse}
        onRegisterClose={(fn) => registerPanel("compatibility", fn)}
        onCloseOthers={() => closeOthers("compatibility")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
        autoOpenLatestFit={autoOpenLatestFit}
        onAutoOpenLatestFitConsumed={onAutoOpenLatestFitConsumed}
        docsReloadKey={docsReloadKey}
      />

      <ResumeAdviceCard
        application={application}
        baseResumeExists={baseResumeExists}
        canUseAi={canUse}
        documentToolRuns={documentToolRuns}
        onRegisterClose={(fn) => registerPanel("resume-advice", fn)}
        onCloseOthers={() => closeOthers("resume-advice")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
        docsReloadKey={docsReloadKey}
      />

      <CoverLetterCard
        application={application}
        baseResumeExists={baseResumeExists}
        baseCoverLetterExists={baseCoverLetterExists}
        canUseAi={canUse}
        documentToolRuns={documentToolRuns}
        onRegisterClose={(fn) => registerPanel("cover-letter", fn)}
        onCloseOthers={() => closeOthers("cover-letter")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
        docsReloadKey={docsReloadKey}
      />

      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 text-centernotif">
        <AlertTriangle className="h-3.5 w-3.5" />
        You can close this drawer — any running AI tools will continue in the background.
      </div>
    </div>
  );
}