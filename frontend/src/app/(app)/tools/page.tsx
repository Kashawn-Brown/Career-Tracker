"use client";

import { useEffect, useState } from "react";
import { useAuth }              from "@/hooks/useAuth";
import { analyticsApi }         from "@/lib/api/analytics";
import type { UsageState }      from "@/types/api";
import { documentsApi }         from "@/lib/api/documents";
import { GenericResumeHelpCard }      from "@/components/tools/GenericResumeHelpCard";
import { GenericCoverLetterHelpCard } from "@/components/tools/GenericCoverLetterHelpCard";
import { GenericInterviewPrepCard }   from "@/components/tools/GenericInterviewPrepCard";
import type { Document } from "@/types/api";

export default function ToolsPage() {
  const { refreshMe } = useAuth();
  const [baseResume,       setBaseResume]       = useState<Document | null | undefined>(undefined);
  const [usageState,      setUsageState]      = useState<UsageState | null>(null);
  // Track whether a base cover letter template exists so the card can show
  // the "using base template" indicator without fetching the file itself.
  const [baseCoverLetterExists, setBaseCoverLetterExists] = useState(false);

  // Load base resume status on mount so cards know whether to show
  // the "no base resume" warning or the "using saved resume" copy.
  useEffect(() => {
    documentsApi
      .getBaseResume()
      .then((res) => setBaseResume(res.baseResume))
      .catch(() => setBaseResume(null));

    // Fetch base cover letter existence independently — non-fatal if it fails
    documentsApi
      .getBaseCoverLetter()
      .then((res) => setBaseCoverLetterExists(Boolean(res.baseCoverLetter)))
      .catch(() => setBaseCoverLetterExists(false));

    // Fetch current usage state for entitlement UI
    analyticsApi.getMyUsage()
      .then(setUsageState)
      .catch(() => null); // non-fatal — cards default to unblocked if fetch fails
  }, []);

  const hasBaseResume = !!baseResume;
  const loading       = baseResume === undefined;

  function handleToolSuccess() {
    void refreshMe();
    // Re-fetch usage state so credit count updates immediately after a run
    analyticsApi.getMyUsage().then(setUsageState).catch(() => null);
  }

  return (
    // class="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8"
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered tools to help with interview prep, resume improvement, and cover letters.
          <br/>
          Results are saved so you can come back to them later.
        </p>

        
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          <GenericResumeHelpCard
            hasBaseResume={hasBaseResume}
            onSuccess={handleToolSuccess}
            isBlocked={usageState?.isBlocked ?? false}
            plan={usageState?.plan ?? "REGULAR"}
          />
          <GenericInterviewPrepCard
            hasBaseResume={hasBaseResume}
            onSuccess={handleToolSuccess}
            isBlocked={usageState?.isBlocked ?? false}
            plan={usageState?.plan ?? "REGULAR"}
          />
          <GenericCoverLetterHelpCard
            hasBaseResume={hasBaseResume}
            baseCoverLetterExists={baseCoverLetterExists}
            onSuccess={handleToolSuccess}
            isBlocked={usageState?.isBlocked ?? false}
            plan={usageState?.plan ?? "REGULAR"}
          />
        </div>
      )}
      {/* Contextual nudge — points users toward the drawer for role-specific work */}
        <p className="mt-2 text-xs text-muted-foreground">
          Looking to prep for, tailor your resume, or generate a cover letter for a{" "}
          <span className="font-medium text-foreground">specific role</span>?{" "}
          <br/>
          Open that application from the{" "}
          <a href="/applications" className="underline underline-offset-2 hover:text-foreground">
            Applications
          </a>{" "}
          page and use the AI Tools section in the drawer.
        </p>
    </div>
  );
}