"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Application } from "@/types/api";
import type { FitRunsController } from "@/hooks/useFitRuns";
import type { DocumentToolRunsController } from "@/hooks/useDocumentToolRuns";
import { useAuth }        from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { analyticsApi }   from "@/lib/api/analytics";
import type { UsageState } from "@/types/api";
import { CompatibilityCheckCard } from "@/components/applications/drawer/CompatibilityCheckCard";
import { InterviewPrepCard }      from "@/components/applications/drawer/InterviewPrepCard";
import { ResumeAdviceCard }       from "@/components/applications/drawer/ResumeAdviceCard";
import { CoverLetterCard }        from "@/components/applications/drawer/CoverLetterCard";
import { getEffectivePlan } from "@/lib/plans";
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
  const { user, refreshMe } = useAuth();

  const [usageState, setUsageState]           = useState<UsageState | null>(null);

  // Fetch (or re-fetch) usage state — called on mount and after every successful run
  // so blocked state and warnings update without requiring a page refresh.
  function refreshUsage() {
    analyticsApi.getMyUsage().then(setUsageState).catch(() => null);
  }

  useEffect(() => { refreshUsage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBlocked  = usageState?.isBlocked ?? false;
  const planLabel  = usageState?.plan ?? (user ? getEffectivePlan(user) : "REGULAR");

  // Shared derived state used by the status bar and passed to cards
  const hasJd = useMemo(
    () => Boolean(application.description?.trim()),
    [application.description]
  );

  return (
    <div className="space-y-3">

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

      {/* ── Usage warning banner (shown at WARNING_90 and BLOCKED) ──────── */}
      {usageState && usageState.threshold === "WARNING_90" && !usageState.isBlocked && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>You&apos;re running low — {usageState.remaining} credit{usageState.remaining === 1 ? "" : "s"} remaining this month.</span>
          </div>
          <Link href="/activity" className="shrink-0 text-orange-700 dark:text-orange-400 underline underline-offset-2 hover:opacity-80">
            View usage
          </Link>
        </div>
      )}

      {/* ── Blocked banner (shown when monthly limit reached) ────────────── */}
      {isBlocked && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
          <p className="text-sm font-medium text-destructive">Monthly credit limit reached</p>
          <p className="text-xs text-muted-foreground">
            Your credits reset at the start of next month. You can request more credits from your profile.
          </p>
          <Link
            href="/profile"
            className="inline-block mt-1 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Request more credits →
          </Link>
        </div>
      )}

      {/* ── Tool cards ──────────────────────────────────────────────────── */}
      {/* Each card gets its own panel ID curried in so the registry can     */}
      {/* target it individually without cards needing to know each other.   */}

      {/* Compatibility tells you how you match the role */}
      <CompatibilityCheckCard
        drawerOpen={drawerOpen}
        application={application}
        fitRuns={fitRuns}
        baseResumeExists={baseResumeExists}
        baseResumeId={baseResumeId}
        canUseAi={!isBlocked}
        isBlocked={isBlocked}
        plan={planLabel}
        creditCost={2}
        onRegisterClose={(fn) => registerPanel("compatibility", fn)}
        onCloseOthers={() => closeOthers("compatibility")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => { void refreshMe(); refreshUsage(); }}
        autoOpenLatestFit={autoOpenLatestFit}
        onAutoOpenLatestFitConsumed={onAutoOpenLatestFitConsumed}
        docsReloadKey={docsReloadKey}
      />

      {/* Resume Advice & Cover Letter help you apply to the role */}
      <ResumeAdviceCard
        application={application}
        baseResumeExists={baseResumeExists}
        canUseAi={!isBlocked}
        isBlocked={isBlocked}
        plan={planLabel}
        creditCost={2}
        documentToolRuns={documentToolRuns}
        onRegisterClose={(fn) => registerPanel("resume-advice", fn)}
        onCloseOthers={() => closeOthers("resume-advice")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => { void refreshMe(); refreshUsage(); }}
        docsReloadKey={docsReloadKey}
      />

      <CoverLetterCard
        application={application}
        baseResumeExists={baseResumeExists}
        baseCoverLetterExists={baseCoverLetterExists}
        canUseAi={!isBlocked}
        isBlocked={isBlocked}
        plan={planLabel}
        creditCost={3}
        documentToolRuns={documentToolRuns}
        onRegisterClose={(fn) => registerPanel("cover-letter", fn)}
        onCloseOthers={() => closeOthers("cover-letter")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => { void refreshMe(); refreshUsage(); }}
        docsReloadKey={docsReloadKey}
      />

      {/* Interview Prep helps you prepare for the interview */}
      <InterviewPrepCard
        application={application}
        baseResumeExists={baseResumeExists}
        canUseAi={!isBlocked}
        isBlocked={isBlocked}
        plan={planLabel}
        creditCost={3}
        documentToolRuns={documentToolRuns}
        onRegisterClose={(fn) => registerPanel("interview-prep", fn)}
        onCloseOthers={() => closeOthers("interview-prep")}
        onDocumentsChanged={onDocumentsChanged}
        onApplicationChanged={onApplicationChanged}
        onRefreshMe={() => { void refreshMe(); refreshUsage(); }}
        docsReloadKey={docsReloadKey}
      />

      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 text-centernotif">
        <AlertTriangle className="h-3.5 w-3.5" />
        You can close this drawer — any running AI tools will continue in the background.
      </div>
    </div>
  );
}