/**
 * interview-prep.dto.ts
 *
 * Types, JSON schema, and normalization for the Interview Prep tool.
 *
 * One shared payload shape is used for both:
 *   - Generic prep  (self-defense from resume/history, no specific job)
 *   - Targeted prep (job-shaped prep from JD + optional resume)
 *
 * This keeps rendering shared and makes it obvious the two variants
 * are the same product at different scopes.
 *
 * Design principles:
 *   - Questions only — no model-generated answers or "ideal response" text
 *   - Empty arrays are valid — model must not manufacture content to fill fields
 *   - focusTopics carry priority so the user knows where to spend time first
 */


// ─── Payload type ─────────────────────────────────────────────────────────────

export type FocusTopicPriority = "HIGH" | "MEDIUM" | "LOW";

export type FocusTopic = {
  topic:    string;
  priority: FocusTopicPriority;
  reason:   string;
};

/**
 * Interview prep artifact payload.
 * Shared across generic and targeted variants.
 */
export type InterviewPrepPayload = {
  // 2–3 sentence overview of what this prep covers and what to focus on
  summary: string;

  // Key topics to prepare, ordered by priority within each tier
  focusTopics: FocusTopic[];

  // Questions about the candidate's background, career path, and decisions
  backgroundQuestions: string[];

  // Questions about technical skills, stack, and domain knowledge
  technicalQuestions: string[];

  // Behavioural questions ("Tell me about a time when…")
  behavioralQuestions: string[];

  // Situational questions ("What would you do if…")
  situationalQuestions: string[];

  // Motivational questions ("Why this role/company/field?")
  motivationalQuestions: string[];

  // Questions likely to challenge or probe weak spots in the candidate's record
  challengeQuestions: string[];

  // Questions the candidate should ask the interviewer
  questionsToAsk: string[];
};


// ─── JSON schema ──────────────────────────────────────────────────────────────

/**
 * Structured output schema for the model.
 * Arrays are not required to be non-empty — the model should leave them
 * empty rather than manufacture questions when nothing genuine applies.
 */
export const InterviewPrepJsonObject = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "focusTopics",
    "backgroundQuestions",
    "technicalQuestions",
    "behavioralQuestions",
    "situationalQuestions",
    "motivationalQuestions",
    "challengeQuestions",
    "questionsToAsk",
  ],
  properties: {
    summary: { type: "string" },

    focusTopics: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "priority", "reason"],
        properties: {
          topic:    { type: "string" },
          priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          reason:   { type: "string" },
        },
      },
    },

    backgroundQuestions:   { type: "array", items: { type: "string" }, maxItems: 8 },
    technicalQuestions:    { type: "array", items: { type: "string" }, maxItems: 8 },
    behavioralQuestions:   { type: "array", items: { type: "string" }, maxItems: 8 },
    situationalQuestions:  { type: "array", items: { type: "string" }, maxItems: 6 },
    motivationalQuestions: { type: "array", items: { type: "string" }, maxItems: 6 },
    challengeQuestions:    { type: "array", items: { type: "string" }, maxItems: 6 },
    questionsToAsk:        { type: "array", items: { type: "string" }, maxItems: 6 },
  },
} as const;


// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize the raw model output:
 * - Trim strings
 * - Cap arrays to schema limits
 * - Remove empty strings
 * - Normalize priority to valid enum values
 * - Deduplicate questions across categories
 */
export function normalizeInterviewPrep(raw: InterviewPrepPayload): InterviewPrepPayload {
  const VALID_PRIORITIES = new Set<FocusTopicPriority>(["HIGH", "MEDIUM", "LOW"]);

  const focusTopics = (Array.isArray(raw.focusTopics) ? raw.focusTopics : [])
    .filter((t) => t?.topic?.trim())
    .map((t) => ({
      topic:    t.topic.trim(),
      priority: VALID_PRIORITIES.has(t.priority) ? t.priority : "MEDIUM" as FocusTopicPriority,
      reason:   (t.reason ?? "").trim(),
    }))
    .slice(0, 8);

  return {
    summary:               (raw.summary ?? "").trim() || "(No summary provided)",
    focusTopics,
    backgroundQuestions:   cleanCap(raw.backgroundQuestions,   8),
    technicalQuestions:    cleanCap(raw.technicalQuestions,    8),
    behavioralQuestions:   cleanCap(raw.behavioralQuestions,   8),
    situationalQuestions:  cleanCap(raw.situationalQuestions,  6),
    motivationalQuestions: cleanCap(raw.motivationalQuestions, 6),
    challengeQuestions:    cleanCap(raw.challengeQuestions,    6),
    questionsToAsk:        cleanCap(raw.questionsToAsk,        6),
  };
}

/** Trim, remove empty strings, cap at max. */
function cleanCap(arr: unknown, max: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}