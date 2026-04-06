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

    // Function to load the base documents
    async function load() {
      setLoading(true);

      try {
        const [resumeRes, clRes] = await Promise.all([
          documentsApi.getBaseResume().catch(() => ({ baseResume: null })),
          documentsApi.getBaseCoverLetter().catch(() => ({ baseCoverLetter: null })),
        ]);
        if (cancelled) return;
        setBaseResumeExists(!!resumeRes.baseResume);
        setBaseCoverLetterExists(!!clRes.baseCoverLetter);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { baseResumeExists, baseCoverLetterExists, loading };
}