/**
 * document-tools.dto.ts
 *
 * Shared types, JSON schemas, and normalization for:
 *   - ResumeAdvice  (generic + targeted)
 *   - CoverLetter   (generic + targeted)
 *
 * Both tools share one payload shape each — the same result components
 * work for generic and targeted variants.
 */


// ─── Resume Advice ────────────────────────────────────────────────────────────

/**
 * Structured resume advice output.
 * Used for both generic and targeted resume advice runs.
 */
export type ResumeAdvicePayload = {
    summary:               string;    // 2–3 sentence overall assessment
    strengths:             string[];  // what's working well — lean into these
    improvements:          string[];  // highest-priority things to fix or add
    tailoring:             string[];  // how to align better with target roles/JD
    rewrites:              string[];  // specific directional rewrite suggestions
    keywords:              string[];  // keywords/concepts worth covering naturally
  };
  
  /**
   * JSON schema for the model's structured output.
   * strict: true requires all keys in `required`.
   */
  export const ResumeAdviceJsonObject = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "strengths", "improvements", "tailoring", "rewrites", "keywords"],
    properties: {
      summary:      { type: "string" },
      strengths:    { type: "array", items: { type: "string" }, maxItems: 6 },
      improvements: { type: "array", items: { type: "string" }, maxItems: 6 },
      tailoring:    { type: "array", items: { type: "string" }, maxItems: 6 },
      rewrites:     { type: "array", items: { type: "string" }, maxItems: 6 },
      keywords:     { type: "array", items: { type: "string" }, maxItems: 12 },
    },
  } as const;
  
  /**
   * Normalize resume advice output — trims strings, caps arrays, removes empties.
   */
  export function normalizeResumeAdvice(raw: ResumeAdvicePayload): ResumeAdvicePayload {
    return {
      summary:      (raw.summary ?? "").trim() || "(No summary provided)",
      strengths:    cleanCap(raw.strengths,    6),
      improvements: cleanCap(raw.improvements, 6),
      tailoring:    cleanCap(raw.tailoring,    6),
      rewrites:     cleanCap(raw.rewrites,     6),
      keywords:     cleanCap(raw.keywords,    12),
    };
  }
  
  
  // ─── Cover Letter ─────────────────────────────────────────────────────────────
  
  /**
   * Structured cover letter output.
   * Used for both generic and targeted cover letter runs.
   */
  export type CoverLetterPayload = {
    summary:            string;    // 1–2 sentence description of what was generated
    draft:              string;    // the actual cover letter text
    evidence:           string[];  // key resume points used as evidence
    notes:              string[];  // customization tips / things to adjust
    placeholders:       string[];  // placeholders in the draft that need filling
  };
  
  /**
   * JSON schema for the model's structured output.
   */
  export const CoverLetterJsonObject = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "draft", "evidence", "notes", "placeholders"],
    properties: {
      summary:      { type: "string" },
      draft:        { type: "string" },
      evidence:     { type: "array", items: { type: "string" }, maxItems: 8 },
      notes:        { type: "array", items: { type: "string" }, maxItems: 6 },
      placeholders: { type: "array", items: { type: "string" }, maxItems: 10 },
    },
  } as const;
  
  /**
   * Normalize cover letter output — trims strings, caps arrays, removes empties.
   */
  export function normalizeCoverLetter(raw: CoverLetterPayload): CoverLetterPayload {
    return {
      summary:      (raw.summary ?? "").trim() || "(No summary provided)",
      draft:        (raw.draft   ?? "").trim() || "",
      evidence:     cleanCap(raw.evidence,    8),
      notes:        cleanCap(raw.notes,       6),
      placeholders: cleanCap(raw.placeholders, 10),
    };
  }
  
  
  // ─── Shared helpers ───────────────────────────────────────────────────────────
  
  /** Trim, filter empty strings, cap at max items. */
  function cleanCap(arr: unknown, max: number): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .slice(0, max);
  }