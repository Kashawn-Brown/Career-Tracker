"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "career-tracker:ai-tools-on-create";

export type AiToolSelections = {
  fit:           boolean;
  interviewPrep: boolean;
  resumeAdvice:  boolean;
  coverLetter:   boolean;
};

type PersistedState = {
  enabled:  boolean;
  selections: AiToolSelections;
};

const DEFAULTS: PersistedState = {
  enabled: false,
  selections: { fit: true, interviewPrep: true, resumeAdvice: true, coverLetter: true },
};

function readFromStorage(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedState & AiToolSelections>;

    // Support old format that only stored selections at the top level
    const sel = parsed.selections ?? parsed;
    return {
      enabled: parsed.enabled ?? DEFAULTS.enabled,
      selections: {
        fit:           (sel as AiToolSelections).fit           ?? DEFAULTS.selections.fit,
        interviewPrep: (sel as AiToolSelections).interviewPrep ?? DEFAULTS.selections.interviewPrep,
        resumeAdvice:  (sel as AiToolSelections).resumeAdvice  ?? DEFAULTS.selections.resumeAdvice,
        coverLetter:   (sel as AiToolSelections).coverLetter   ?? DEFAULTS.selections.coverLetter,
      },
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Persists the "Run AI tools after creation" toggle state and tool selections
 * to localStorage so they carry over across sessions.
 * File selections (override resume, template) are never stored.
 */
export function useAiToolsOnCreate(): {
  enabled:          boolean;
  setEnabled:       (v: boolean) => void;
  selections:       AiToolSelections;
  updateSelections: (next: AiToolSelections) => void;
} {
  const [state, setState] = useState<PersistedState>(readFromStorage);

  function persist(next: PersistedState) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage unavailable — silently ignore */ }
  }

  const setEnabled = useCallback((v: boolean) => {
    setState((prev) => {
      const next = { ...prev, enabled: v };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateSelections = useCallback((next: AiToolSelections) => {
    setState((prev) => {
      const updated = { ...prev, selections: next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // suppress unused warning on persist — used for future direct calls if needed
  void persist;

  return {
    enabled:          state.enabled,
    setEnabled,
    selections:       state.selections,
    updateSelections,
  };
}