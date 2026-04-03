"use client";

import { useEffect, useState } from "react";
import { documentsApi } from "@/lib/api/documents";

/**
 * Fetches whether the user has a base resume and/or base cover letter saved.
 * Used by both create forms to drive the AI tools after-create panel.
 * Fetches once on mount — refreshKey can be incremented to re-fetch after upload.
 */
export function useBaseDocuments(refreshKey = 0): {
  baseResumeExists:      boolean;
  baseCoverLetterExists: boolean;
  loading:               boolean;
} {
  const [baseResumeExists,      setBaseResumeExists]      = useState(false);
  const [baseCoverLetterExists, setBaseCoverLetterExists] = useState(false);
  const [loading,               setLoading]               = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      documentsApi.getBaseResume().catch(() => ({ baseResume: null })),
      documentsApi.getBaseCoverLetter().catch(() => ({ baseCoverLetter: null })),
    ]).then(([resumeRes, clRes]) => {
      if (cancelled) return;
      setBaseResumeExists(!!resumeRes.baseResume);
      setBaseCoverLetterExists(!!clRes.baseCoverLetter);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
    // refreshKey incremented externally to re-fetch after user uploads a base doc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return { baseResumeExists, baseCoverLetterExists, loading };
}