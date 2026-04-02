"use client";

import { useEffect, useState } from "react";
import { applicationDocumentsApi } from "@/lib/api/application-documents";
import type { Document } from "@/types/api";

// Kinds that are valid resume sources for AI tool runs
const RESUME_KINDS = new Set(["CAREER_HISTORY", "RESUME"]);

export type ApplicationResumeDoc = {
  id:           number;
  originalName: string;
  kind:         string;
};

/**
 * Fetches documents attached to an application and filters to resume-type kinds.
 * Used by the drawer AI tool cards so the user can pick an already-attached
 * resume instead of uploading the same file again for each tool.
 */
export function useApplicationDocs(applicationId: string): {
  resumeDocs: ApplicationResumeDoc[];
  loading:    boolean;
} {
  const [resumeDocs, setResumeDocs] = useState<ApplicationResumeDoc[]>([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    applicationDocumentsApi
      .list(applicationId)
      .then((res) => {
        if (cancelled) return;
        // Filter to resume-type kinds only — COVER_LETTER, OTHER etc. aren't useful
        const filtered = res.documents
          .filter((d: Document) => RESUME_KINDS.has(d.kind))
          .map((d: Document) => ({
            id:           typeof d.id === "string" ? Number(d.id) : (d.id as number),
            originalName: d.originalName,
            kind:         d.kind,
          }));
        setResumeDocs(filtered);
      })
      .catch(() => { if (!cancelled) setResumeDocs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [applicationId]);

  return { resumeDocs, loading };
}