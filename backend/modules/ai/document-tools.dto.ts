/**
 * document-tools.dto.ts
 *
 * Shared types, JSON schemas, and normalization for:
 *   - ResumeAdvice  (generic + targeted)
 *   - CoverLetter   (generic + targeted)
 *
 * Both tools share one payload shape each — the same result components
 * work for generic and targeted variants.
 *
 * Shape version: v2
 *   v1 fields (improvements, tailoring) replaced by (improvements, roleAlignment).
 *   Legacy v1 artifacts are detected on the frontend via "tailoring" in payload.
 */


// ─── Resume Advice ────────────────────────────────────────────────────────────

/**
 * Structured resume advice output — v2 shape.
 *
 * Distinct from Fit: this tool focuses entirely on the resume document itself.
 * It answers "how do I improve this resume (for this role)?", not
 * "how well do I match this role?".
 */
export type ResumeAdvicePayload = {
  summary:       string;    // 2–3 sentence overall assessment of the resume
  strengths:     string[];  // what's working well and should be leaned into
  improvements:  string[];  // what's weak, vague, or undersold — things to fix
  roleAlignment: string[];  // role-specific emphasis: what to push, shift, or add for THIS JD
  rewrites:      string[];  // specific directional rewrite suggestions for bullets/sections
  keywordsPresent: string[];  // relevant keywords already in the resume — keep these
  keywordsMissing:  string[];  // relevant keywords not found in the resume — worth adding naturally
};

/**
 * JSON schema for the model's structured output.
 * Arrays are not required to be non-empty — the model should leave them
 * empty rather than manufacture feedback when nothing genuinely applies.
 */
export const ResumeAdviceJsonObject = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "strengths", "improvements", "roleAlignment", "rewrites", "keywordsPresent", "keywordsMissing"],
  properties: {
    summary:       { type: "string" },
    strengths:     { type: "array", items: { type: "string" }, maxItems: 6 },
    improvements:  { type: "array", items: { type: "string" }, maxItems: 6 },
    roleAlignment: { type: "array", items: { type: "string" }, maxItems: 6 },
    rewrites:      { type: "array", items: { type: "string" }, maxItems: 6 },
    // Two classified buckets — model cross-references resume text before assigning
    keywordsPresent: { type: "array", items: { type: "string" }, maxItems: 8 },
    keywordsMissing: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
} as const;

/**
 * Normalize resume advice output — trims strings, caps arrays, removes empties.
 */
export function normalizeResumeAdvice(raw: ResumeAdvicePayload): ResumeAdvicePayload {
  return {
    summary:       (raw.summary ?? "").trim() || "(No summary provided)",
    strengths:     cleanCap(raw.strengths,     6),
    improvements:  cleanCap(raw.improvements,  6),
    roleAlignment: cleanCap(raw.roleAlignment, 6),
    rewrites:      cleanCap(raw.rewrites,      6),
    keywordsPresent: cleanCap(raw.keywordsPresent, 8),
    keywordsMissing:  cleanCap(raw.keywordsMissing,  8),
  };
}


// ─── Cover Letter ─────────────────────────────────────────────────────────────

/**
 * Structured cover letter output.
 * Used for both generic and targeted cover letter runs.
 */
export type CoverLetterPayload = {
  summary:      string;    // 1–2 sentence description of what was generated
  draft:        string;    // the actual cover letter text
  evidence:     string[];  // key resume points used as evidence
  notes:        string[];  // customization tips / things to adjust before sending
  placeholders: string[];  // placeholders in the draft that need filling in
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
    evidence:     cleanCap(raw.evidence,     8),
    notes:        cleanCap(raw.notes,        6),
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