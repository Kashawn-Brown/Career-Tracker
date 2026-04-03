"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "career-tracker:ai-tools-on-create";

export type AiToolSelections = {
  fit:          boolean;
  resumeAdvice: boolean;
  coverLetter:  boolean;
};

const DEFAULT_SELECTIONS: AiToolSelections = {
  fit:          true,
  resumeAdvice: true,
  coverLetter:  true,
};

function readFromStorage(): AiToolSelections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTIONS;
    const parsed = JSON.parse(raw) as Partial<AiToolSelections>;
    // Merge with defaults so new tools added later don't default to undefined
    return {
      fit:          parsed.fit          ?? DEFAULT_SELECTIONS.fit,
      resumeAdvice: parsed.resumeAdvice ?? DEFAULT_SELECTIONS.resumeAdvice,
      coverLetter:  parsed.coverLetter  ?? DEFAULT_SELECTIONS.coverLetter,
    };
  } catch {
    return DEFAULT_SELECTIONS;
  }
}

/**
 * Persists which AI tools the user wants to run after creating an application.
 * Reads from localStorage on mount so selections carry over across sessions.
 * Only tool checkbox state is persisted — file selections are never stored.
 */
export function useAiToolsOnCreate(): {
  selections:       AiToolSelections;
  updateSelections: (next: AiToolSelections) => void;
} {
  const [selections, setSelections] = useState<AiToolSelections>(readFromStorage);

  const updateSelections = useCallback((next: AiToolSelections) => {
    setSelections(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage unavailable — silently ignore */ }
  }, []);

  return { selections, updateSelections };
}