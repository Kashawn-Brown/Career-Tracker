"use client";

import { useEffect, useState } from "react";
import { useAuth }              from "@/hooks/useAuth";
import { documentsApi }         from "@/lib/api/documents";
import { GenericResumeHelpCard }      from "@/components/tools/GenericResumeHelpCard";
import { GenericCoverLetterHelpCard } from "@/components/tools/GenericCoverLetterHelpCard";
import type { Document } from "@/types/api";

export default function ToolsPage() {
  const { refreshMe } = useAuth();
  const [baseResume, setBaseResume] = useState<Document | null | undefined>(undefined);

  // Load base resume status on mount so cards know whether to show
  // the "no base resume" warning or the "using saved resume" copy.
  useEffect(() => {
    documentsApi
      .getBaseResume()
      .then((res) => setBaseResume(res.baseResume))
      .catch(() => setBaseResume(null));
  }, []);

  const hasBaseResume = !!baseResume;
  const loading       = baseResume === undefined;

  function handleToolSuccess() {
    // Refresh auth so AI credit count stays in sync after a successful run
    void refreshMe();
  }

  return (
    // class="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8"
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered tools to help improve your resume and craft cover letters.  
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
          />
          <GenericCoverLetterHelpCard
            hasBaseResume={hasBaseResume}
            onSuccess={handleToolSuccess}
          />
        </div>
      )}
      {/* Contextual nudge — points users toward the drawer for role-specific work */}
        <p className="mt-2 text-xs text-muted-foreground">
          Looking to tailor your resume or generate a cover letter for a{" "}
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