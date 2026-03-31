"use client";

import { useEffect, useState } from "react";
import { useAuth }             from "@/hooks/useAuth";
import { documentsApi }        from "@/lib/api/documents";
import { GenericResumeHelpCard }      from "@/components/tools/GenericResumeHelpCard";
import { GenericCoverLetterHelpCard } from "@/components/tools/GenericCoverLetterHelpCard";
import type { Document } from "@/types/api";

export default function ToolsPage() {
  const { refreshMe } = useAuth();
  const [baseResume, setBaseResume] = useState<Document | null | undefined>(undefined);

  // Load base resume status on mount so tool cards know whether to show
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
    // Refresh the user so credit count stays in sync after a successful run
    void refreshMe();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered tools to help improve your resume and craft cover letters.
          Results are saved so you can come back to them later.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
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
    </div>
  );
}