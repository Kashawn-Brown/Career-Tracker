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
 *
 * `reloadKey` can be incremented by the parent to force a fresh fetch without
 * unmounting — used when ApplicationDocumentsSection uploads a new file so the
 * AI tool pickers update immediately without a full drawer close/reopen.
 */
export function useApplicationDocs(
  applicationId: string,
  reloadKey = 0,
): {
  resumeDocs: ApplicationResumeDoc[];
  loading:    boolean;
} {
  const [resumeDocs, setResumeDocs] = useState<ApplicationResumeDoc[]>([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Function to load the application documents
    async function load() {
      // State updates inside async entry — avoids react-hooks/set-state-in-effect
      setLoading(true);

      try {
        const res = await applicationDocumentsApi.list(applicationId);
        if (cancelled) return;

        const filtered = res.documents
          .filter((d: Document) => RESUME_KINDS.has(d.kind))
          .map((d: Document) => ({
            id:           typeof d.id === "string" ? Number(d.id) : (d.id as number),
            originalName: d.originalName,
            kind:         d.kind,
          }));

        setResumeDocs(filtered);
      } catch {
        if (!cancelled) setResumeDocs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [applicationId, reloadKey]);

  return { resumeDocs, loading };
}