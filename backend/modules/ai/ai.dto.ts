import { JobType, WorkMode } from "@prisma/client";
import { UserPlan } from "@prisma/client";
import type { AiTier } from "./ai-tier.js";
import { AI_MODELS } from "./openai.js";


// ------------------- EXTRACT JOB DESCRIPTION -------------------

/**
 * Canonical source metadata attached to every draft response.
 * Tells the frontend where the text came from and preserves the
 * cleaned job-posting text for the created application's description.
 */
export type DraftSource = {
  mode:            "TEXT" | "LINK";
  canonicalJdText: string;
  sourceUrl?:      string;
};

/**
 * Type for the application draft from a job description.
 * Extended with `source` so the frontend always has canonical JD text
 * regardless of whether the user pasted text or extracted from a URL.
 */
export type ApplicationFromJdResponse = {
  extracted: {
    company?:        string;
    position?:       string;

    location?:       string;
    locationDetails?: string;

    workMode?:        WorkMode;
    workModeDetails?: string;

    jobType?:         JobType;
    jobTypeDetails?:  string;

    salaryText?:      string;
    salaryDetails?:   string;
    
    jobLink?:         string;
    tagsText?:        string;

    notes?:           string[];
  };
  ai: {
    jdSummary:    string;
    cleanedJdText?: string; // LINK mode only: raw JD text stripped of page chrome
    warnings?:    string[];
  };
  source: DraftSource;
};

// Allow enums the backend actually supports.
// We *prefer* omitting UNKNOWN, but we allow it in schema and normalize it out.
const WORK_MODE_VALUES = Object.values(WorkMode);
const JOB_TYPE_VALUES  = Object.values(JobType);

/**
 * JSON object for the response of the POST /api/v1/ai/application-from-jd request.
 * Note: `source` is NOT included here — it is attached by the service layer after
 * AI extraction, not produced by the model itself.
 */
export const ApplicationFromJdJsonObject = {
  type: "object",
  additionalProperties: false,
  required: ["extracted", "ai"],
  properties: {
    extracted: {
      type: "object",
      additionalProperties: false,
      // strict mode expects required to include every property key
      required: [
        "company",
        "position",
        "location",
        "locationDetails",
        "workMode",
        "workModeDetails",
        "jobType",
        "jobTypeDetails",
        "salaryText",
        "salaryDetails",
        "jobLink",
        "tagsText",
        "notes",
      ],
      properties: {
        company:  { type: ["string", "null"] },
        position: { type: ["string", "null"] },

        location:        { type: ["string", "null"] },
        locationDetails: { type: ["string", "null"] },

        workMode: {
          anyOf: [
            { type: "string", enum: WORK_MODE_VALUES },
            { type: "null" },
          ],
        },
        workModeDetails: { type: ["string", "null"] },

        jobType: {
          anyOf: [
            { type: "string", enum: JOB_TYPE_VALUES },
            { type: "null" },
          ],
        },
        jobTypeDetails: { type: ["string", "null"] },

        salaryText:    { type: ["string", "null"] },
        salaryDetails: { type: ["string", "null"] },
        jobLink:       { type: ["string", "null"] },
        tagsText:      { type: ["string", "null"] },

        notes: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            { type: "null" },
          ],
        },
      },
    },
    ai: {
      type: "object",
      additionalProperties: false,
      // strict mode expects required to include every property key
      required: ["jdSummary", "cleanedJdText", "warnings"],
      properties: {
        jdSummary:    { type: ["string", "null"] },
        cleanedJdText: { type: ["string", "null"] },
        warnings: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            { type: "null" },
          ],
        },
      },
    },
  },
} as const;


// ─── NORMALIZATION HELPERS ─────────────────────────────────────────────────────

// Province/state full-name → abbreviation lookup.
// Used to normalize model output like "Ontario" → "ON", "California" → "CA".
const PROVINCE_STATE_ABBR: Record<string, string> = {
  // Canadian provinces & territories
  "alberta":                  "AB",
  "british columbia":         "BC",
  "manitoba":                 "MB",
  "new brunswick":            "NB",
  "newfoundland and labrador":"NL",
  "newfoundland":             "NL",
  "northwest territories":    "NT",
  "nova scotia":              "NS",
  "nunavut":                  "NU",
  "ontario":                  "ON",
  "prince edward island":     "PE",
  "quebec":                   "QC",
  "québec":                   "QC",
  "saskatchewan":             "SK",
  "yukon":                    "YT",
  // US states
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC",
};

// Tracking query params to strip from job links.
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "msclkid", "dclid", "ttclid",
]);

// Patterns that indicate a Job ID bullet (case-insensitive).
// e.g. "Job ID: R260003457", "Req #: 71181", "Reference: P-1234"
const JOB_ID_PATTERN = /^(?:job\s*(?:id|#|number|no\.?)|req(?:uisition)?\s*(?:id|#|number|no\.?)|reference\s*(?:id|#|number)?|posting\s*(?:id|#|number)?|job\s*code)\s*[:\-–]?\s*(.+)$/i;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trims, removes empty strings, and strips known placeholder values.
 */
function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (!trimmed.length) return undefined;

  const lower = trimmed.toLowerCase();
  const banned = new Set([
    "none", "n/a", "na", "unknown", "null", "undefined",
    "none indicated",
    "other locations: none", "other locations: n/a", "other locations: null",
  ]);
  if (banned.has(lower)) return undefined;

  return trimmed;
}

/**
 * Cleans an array of strings — trims, removes empties, caps length.
 */
function cleanStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanString(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, max);
}

/**
 * Cleans an enum value — trims and rejects if not in the allowed set.
 */
function cleanEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim() as T;
  return allowed.includes(trimmed) ? trimmed : undefined;
}

/**
 * Normalizes tags text:
 * - splits on comma / semicolon / newline
 * - trims each token
 * - deduplicates case-insensitively (keeps first occurrence's casing)
 * - rejoins as ", "
 */
function normalizeTagsText(v: unknown): string | undefined {
  const raw = cleanString(v);
  if (!raw) return undefined;

  const parts = raw
    .split(/[;,\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return undefined;

  // Dedupe case-insensitively, keep first-seen casing
  const seen  = new Set<string>();
  const deduped: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  return deduped.join(", ");
}

/**
 * Normalizes a job link:
 * - must start with http:// or https://
 * - lowercases the host
 * - strips fragment (#...)
 * - strips known tracking query params (utm_*, fbclid, gclid, etc.)
 * Returns undefined if the value is not a valid http/https URL.
 */
function normalizeJobLink(v: unknown): string | undefined {
  const raw = cleanString(v);
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined; // not a valid URL
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

  // Lowercase host
  url.hostname = url.hostname.toLowerCase();

  // Strip fragment
  url.hash = "";

  // Strip tracking params
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

/**
 * Normalizes a location string:
 * - normalizes whitespace and comma spacing
 * - expands province/state full names to abbreviations (Ontario → ON)
 * - preserves "+N" patterns (e.g. "Toronto, ON +3")
 * - does NOT guess or infer cities from abbreviations
 */
function normalizeLocation(v: unknown): string | undefined {
  const raw = cleanString(v);
  if (!raw) return undefined;

  // Preserve "+N" suffix if present (e.g. "Toronto, Ontario +2")
  const plusMatch = raw.match(/(\s*\+\d+\s*)$/);
  const plusSuffix = plusMatch ? plusMatch[0].trim() : "";
  const base = plusSuffix ? raw.slice(0, raw.length - plusMatch![0].length).trim() : raw;

  // Split on commas, normalize each part.
  // Only abbreviate province/state when a city is also present —
  // a standalone "Ontario" or "Canada" should remain unabbreviated.
  const rawParts = base.split(",");
  const parts = rawParts.map((p) => {
    const trimmed = p.trim();
    const lower   = trimmed.toLowerCase();
    if (rawParts.length > 1 && PROVINCE_STATE_ABBR[lower]) {
      return PROVINCE_STATE_ABBR[lower];
    }
    return trimmed;
  });

  // Rejoin with consistent ", " spacing
  const normalized = parts.join(", ");

  return plusSuffix ? `${normalized} ${plusSuffix}` : normalized;
}

/**
 * Normalizes salary text:
 * - expands "k" shorthand (80k → 80,000)
 * - adds "$" prefix if missing
 * - standardizes range separator to em-dash " – "
 * - moves currency code to the end (e.g. "CAD $80,000" → "$80,000 CAD")
 * - preserves "/hr" or "/hour" for hourly rates
 * Conservative: if the value doesn't look like a salary, returns it cleaned but unchanged.
 */
function normalizeSalaryText(v: unknown): string | undefined {
  const raw = cleanString(v);
  if (!raw) return undefined;

  // Detect hourly marker
  const isHourly = /\/\s*h(?:ou?r?)?/i.test(raw);

  // Extract currency code if present (3-letter code like CAD, USD, GBP)
  const currencyMatch = raw.match(/\b([A-Z]{3})\b/);
  const currency = currencyMatch ? currencyMatch[1] : null;

  // Remove currency code from the string for processing
  let working = currency ? raw.replace(new RegExp(`\\b${currency}\\b`, "g"), "").trim() : raw;

  // Remove hourly suffix temporarily for processing
  working = working.replace(/\/\s*h(?:ou?r?)?/i, "").trim();

  // Remove stray leading/trailing symbols that are not part of numbers
  working = working.replace(/^[$\s]+|[$\s]+$/g, "").trim();

  // Expand "k" → "000" (e.g. "80k" → "80,000", "80.5k" → "80,500")
  working = working.replace(/(\d+(?:\.\d+)?)\s*[kK]\b/g, (_, n) => {
    const expanded = Math.round(parseFloat(n) * 1000);
    return expanded.toLocaleString("en-US");
  });

  // Standardize range separator: -, —, –, " to " → " – "
  working = working.replace(/\s*(?:–|—|-{1,2}|to)\s*/gi, " – ");

  // Add "$" at the start of each salary segment, not inside comma-separated numbers
  working = working
    .split(" – ")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      if (trimmed.includes("$")) return trimmed;

      // Add $ to the first numeric amount in this segment only
      return trimmed.replace(/(\d[\d,]*(?:\.\d+)?)/, "$$$1");
    })
    .join(" – ");

  // Reassemble
  const parts: string[] = [working.trim()];
  if (isHourly)          parts[0] += "/hr";
  if (currency)          parts.push(currency);

  return parts.join(" ").trim() || raw;
}

/**
 * Normalizes the notes array:
 * - deduplicates identical bullets (case-insensitive)
 * - hoists any Job ID bullet to the front
 * - caps at 20 items
 */
function normalizeNotes(v: unknown): string[] {
  const raw = cleanStringArray(v, 40); // over-fetch before dedup/cap
  if (!raw.length) return [];

  // Dedup case-insensitively, keep first occurrence
  const seen  = new Set<string>();
  const deduped: string[] = [];
  for (const note of raw) {
    const key = note.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(note);
  }

  // Hoist Job ID bullet to the front if present
  const jobIdIndex = deduped.findIndex((n) => JOB_ID_PATTERN.test(n));
  if (jobIdIndex > 0) {
    const [jobIdBullet] = deduped.splice(jobIdIndex, 1);
    deduped.unshift(jobIdBullet);
  }

  return deduped.slice(0, 20);
}

/**
 * Cleans raw JD text before using it as canonicalJdText:
 * - strips non-breaking spaces and zero-width chars
 * - collapses runs of 3+ blank lines down to a single blank line
 * - trims leading/trailing whitespace
 */
export function cleanJdText(text: string): string {
  return text
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ") // non-breaking / zero-width → space
    .replace(/\r\n/g, "\n")                              // normalize CRLF
    .replace(/\r/g, "\n")                                // normalize CR
    .replace(/\n{3,}/g, "\n\n")                          // collapse 3+ newlines → 2
    .trim();
}

/** Cap length on moderation retry (large scraped pages can hit edge cases). */
const JD_MODERATION_RETRY_MAX_CHARS = 14_000;

/**
 * Strips common triggers for provider safety filters (long URLs, emails, bare www links)
 * and caps length. Used for a single automatic retry when JD extraction returns
 * `content_filter` — the original JD is still kept for `source.canonicalJdText`.
 */
export function sanitizeJdForModerationRetry(text: string): string {
  let t = text
    .replace(/https?:\/\/[^\s<>"']+/gi, "[link]")
    .replace(/\b[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/(?<![\w/])www\.[^\s<>'"]+/gi, "[link]");
  t = cleanJdText(t);
  if (t.length > JD_MODERATION_RETRY_MAX_CHARS) {
    t =
      t.slice(0, JD_MODERATION_RETRY_MAX_CHARS) +
      "\n\n[... text truncated for processing ...]";
  }
  return t;
}

/**
 * Normalize the AI response so the UI doesn't get noisy values.
 * - trims strings
 * - strips UNKNOWN enums (we prefer "omit if unclear")
 * - tightens tags, jobLink, location, salary, notes
 * - removes undefined keys
 *
 * `source` is attached by the service layer and passed through unchanged.
 */
export function normalizeApplicationFromJdResponse(
  raw:    ApplicationFromJdResponse,
  source: DraftSource,
): ApplicationFromJdResponse {
  const extracted = raw.extracted ?? ({} as ApplicationFromJdResponse["extracted"]);

  const normalized: ApplicationFromJdResponse = {
    extracted: {
      company:  cleanString(extracted.company),
      position: cleanString(extracted.position),

      location:        normalizeLocation(extracted.location),
      locationDetails: cleanString(extracted.locationDetails),

      workMode:        cleanEnum(extracted.workMode, WORK_MODE_VALUES),
      workModeDetails: cleanString(extracted.workModeDetails),

      jobType:        cleanEnum(extracted.jobType, JOB_TYPE_VALUES),
      jobTypeDetails: cleanString(extracted.jobTypeDetails),

      salaryText:    normalizeSalaryText(extracted.salaryText),
      salaryDetails: cleanString(extracted.salaryDetails),

      jobLink:  normalizeJobLink(extracted.jobLink),
      tagsText: normalizeTagsText(extracted.tagsText),

      notes: normalizeNotes(extracted.notes),
    },
    ai: {
      jdSummary:     cleanString(raw.ai?.jdSummary) ?? "(No summary provided)",
      cleanedJdText: cleanString(raw.ai?.cleanedJdText) || undefined,
      warnings:      cleanStringArray(raw.ai?.warnings, 10) || undefined,
    },
    source,
  };

  // Remove undefined keys to keep the payload clean.
  Object.keys(normalized.extracted).forEach((k) => {
    const key = k as keyof typeof normalized.extracted;
    if (normalized.extracted[key] === undefined) delete normalized.extracted[key];
  });

  return normalized;
}


// ─── FIT_V1 ────────────────────────────────────────────────────────────────────

/**
 * Fit v1 payload — v2 shape.
 *
 * Distinct from Resume Advice: Fit operates on the candidate as a whole
 * (their history, roles, skills) and answers "how well do I line up against
 * this role?" — not "how do I fix my resume?".
 *
 * v2 removes recommendedEdits (resume advice's job) and questionsToAsk
 * (Phase 8 interview prep's job). Adds roleSignals and prepAreas.
 * Legacy v1 artifacts are detected on the frontend via "recommendedEdits" in payload.
 */
export type FitV1Response = {
  score:       number;    // 0–100 overall fit score
  fitSummary:  string;    // 2–3 sentence narrative shown in the drawer card
  strengths:   string[];  // strongest alignments between candidate and role
  gaps:        string[];  // shortfalls, missing requirements, and risk areas
  roleSignals: string[];  // what the JD is actually prioritising — helps candidate weight their read
  prepAreas:   string[];  // skills/concepts worth studying before pursuing this role
};

export const FitV1JsonObject = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "fitSummary",
    "strengths",
    "gaps",
    "roleSignals",
    "prepAreas",
  ],
  properties: {
    score:       { type: "number" },
    fitSummary:  { type: "string" },
    strengths:   { type: "array", items: { type: "string" }, maxItems: 7 },
    gaps:        { type: "array", items: { type: "string" }, maxItems: 7 },
    // Arrays may be empty — model should not manufacture content to fill them
    roleSignals: { type: "array", items: { type: "string" }, maxItems: 5 },
    prepAreas:   { type: "array", items: { type: "string" }, maxItems: 6 },
  },
} as const;


// ─── FIT_V1 HELPERS ────────────────────────────────────────────────────────────

type FitVerbosity = "low" | "medium" | "high";
type FitEffort    = "low" | "medium" | "high" | "xhigh";

type FitPolicy = {
  tier:            AiTier;
  model:           string;
  verbosity:       FitVerbosity;
  effort:          FitEffort;
  maxOutputTokens: number;
};

/**
 * Output token budgets by plan.
 * Higher plans get more tokens for richer output.
 */
const FIT_MAX_OUTPUT_TOKENS_BY_PLAN: Record<AiTier, number> = {
  [UserPlan.REGULAR]:  10_000,
  [UserPlan.PRO]:      15_000,
  [UserPlan.PRO_PLUS]: 20_000,
};

/**
 * Returns the model/effort/verbosity config for a FIT_V1 run
 * based on the user's plan.
 */
export function getFitPolicyForPlan(plan: AiTier): FitPolicy {
  const maxOutputTokens = FIT_MAX_OUTPUT_TOKENS_BY_PLAN[plan] ?? 10_000;

  switch (plan) {
    case UserPlan.PRO_PLUS:
      return { tier: plan, model: AI_MODELS.FIT_PRO_PLUS, effort: "medium",   verbosity: "medium",   maxOutputTokens };
    case UserPlan.PRO:
      return { tier: plan, model: AI_MODELS.FIT_PRO,      effort: "medium", verbosity: "medium", maxOutputTokens };
    case UserPlan.REGULAR:
    default:
      return { tier: plan, model: AI_MODELS.FIT_REGULAR,  effort: "low",    verbosity: "low",    maxOutputTokens };
  }
}

export type FitV1RunResult = {
  payload: FitV1Response;
  model:   string;
  tier:    AiTier;
};

// Clamp score to 0–100
function clampFitScore(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Dedupe case-insensitively while keeping order + cap
function dedupeAndCap(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Normalizes FIT_V1 output — clamps score, dedupes, caps arrays.
 */
export function normalizeFitV1Response(raw: FitV1Response): FitV1Response {
  return {
    score:       clampFitScore(raw.score),
    fitSummary:  (typeof raw.fitSummary === "string" ? raw.fitSummary.trim() : "") || "(No summary provided)",
    strengths:   dedupeAndCap(cleanStringArray(raw.strengths,   20), 7),
    gaps:        dedupeAndCap(cleanStringArray(raw.gaps,        20), 7),
    roleSignals: dedupeAndCap(cleanStringArray(raw.roleSignals, 20), 5),
    prepAreas:   dedupeAndCap(cleanStringArray(raw.prepAreas,   20), 6),
  };
}