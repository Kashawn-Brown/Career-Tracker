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

  baseResumeExists: boolean;
  baseResumeId:     number | null;

  onDocumentsChanged?:  (applicationId: string) => void;
  onCloseOthers?:       () => void;
  onRegisterClose?:     (fn: () => void) => void;
  onApplicationChanged?: (applicationId: string) => void;

  autoOpenLatestFit?:          boolean;
  onAutoOpenLatestFitConsumed?: () => void;
};

/**
 * ApplicationAiToolsSection — orchestrates all AI tool cards for a single application.
 *
 * Responsibilities:
 *  - Shows a shared status bar (JD + base resume) visible across all tools
 *  - Renders the ProAccessBanner (applies to all tools, not just Fit)
 *  - Delegates tool-specific logic to CompatibilityCheckCard, ResumeAdviceCard, CoverLetterCard
 */
export function ApplicationAiToolsSection({
  drawerOpen,
  application,
  fitRuns,
  documentToolRuns,
  baseResumeExists,
  baseResumeId,
  onDocumentsChanged,
  onCloseOthers,
  onRegisterClose,
  onApplicationChanged,
  autoOpenLatestFit,
  onAutoOpenLatestFitConsumed,
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
              {baseResumeExists ? "Saved" : "Not uploaded"}
            </span>
          </span>
        </div>
      </div>

      {/* ── Tool cards ──────────────────────────────────────────────────── */}

      <CompatibilityCheckCard
        drawerOpen={drawerOpen}
        application={application}
        fitRuns={fitRuns}
        baseResumeExists={baseResumeExists}
        baseResumeId={baseResumeId}
        canUseAi={canUse}
        onCloseOthers={onCloseOthers}
        onRegisterClose={onRegisterClose}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
        autoOpenLatestFit={autoOpenLatestFit}
        onAutoOpenLatestFitConsumed={onAutoOpenLatestFitConsumed}
      />

      <ResumeAdviceCard
        application={application}
        baseResumeExists={baseResumeExists}
        canUseAi={canUse}
        documentToolRuns={documentToolRuns}
        onCloseOthers={onCloseOthers}
        onRegisterClose={onRegisterClose}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
      />

      <CoverLetterCard
        application={application}
        baseResumeExists={baseResumeExists}
        canUseAi={canUse}
        documentToolRuns={documentToolRuns}
        onCloseOthers={onCloseOthers}
        onRegisterClose={onRegisterClose}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => void refreshMe()}
      />

      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 text-centernotif">
        <AlertTriangle className="h-3.5 w-3.5" />
        You can close this drawer — any running tools will continue in the background.
      </div>
    </div>
  );
}