import { JobType, WorkMode } from "@prisma/client";
import { AiTier } from "./ai-tier.js";


// ------------------- EXTRACT JOB DESCRIPTION -------------------

/**
 * Type for the application draft from a job description.
 */
export type ApplicationFromJdResponse = {
  extracted: {
    company?: string;
    position?: string;

    location?: string;
    locationDetails?: string;

    workMode?: WorkMode;
    workModeDetails?: string;

    jobType?: JobType;
    jobTypeDetails?: string;

    salaryText?: string;
    salaryDetails?: string;
    
    jobLink?: string;
    tagsText?: string;

    notes?: string[];
  };
  ai: {
    jdSummary: string;
    warnings?: string[];
  };
};

// Allow enums the backend actually supports.
// We *prefer* omitting UNKNOWN, but we allow it in schema and normalize it out.
const WORK_MODE_VALUES = Object.values(WorkMode);
const JOB_TYPE_VALUES = Object.values(JobType);

/**
 * JSON object for the response of the POST /api/v1/ai/application-from-jd request.
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
        company: { type: ["string", "null"] },
        position: { type: ["string", "null"] },

        location: { type: ["string", "null"] },
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

        salaryText: { type: ["string", "null"] },
        salaryDetails: { type: ["string", "null"] },
        jobLink: { type: ["string", "null"] },
        tagsText: { type: ["string", "null"] },

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
      required: ["jdSummary", "warnings"],
      properties: {
        jdSummary: { type: ["string", "null"] },
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

// ------------ EXTRACT JOB DESCRIPTION HELPER FUNCTIONS ------------

// Helper function to clean a string. (trim and remove empty strings)
function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (!trimmed.length) return undefined;

  // Never allow placeholder strings into UI
  const lower = trimmed.toLowerCase();
  const banned = new Set([
    "none",
    "n/a",
    "na",
    "unknown",
    "null",
    "undefined",
    "other locations: none",
    "other locations: n/a",
    "other locations: null",
  ]);
  if (banned.has(lower)) return undefined;

  return trimmed;
}

// Helper function to clean an array of strings. (trim and remove empty strings)
function cleanStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanString(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, max);
}

// Helper function to clean an enum. (trim and remove if not in allowed values)
function cleanEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim() as T;
    return allowed.includes(trimmed) ? trimmed : undefined;
  }

function normalizeTagsText(v: unknown): string | undefined {
  const raw = cleanString(v);
  if (!raw) return undefined;

  // Accept commas or semicolons, but normalize output to ", "
  const parts = raw
    .split(/[;,]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  if (!unique.length) return undefined;

  // Cap to keep UI stable
  return unique.slice(0, 12).join(", ");
}
  
/**
 * Normalize the AI response so the UI doesn't get noisy values.
 * - trims strings
 * - strips UNKNOWN enums (we prefer "omit if unclear")
 * - caps array sizes
 * - removes undefined keys
 */
export function normalizeApplicationFromJdResponse(raw: ApplicationFromJdResponse): ApplicationFromJdResponse {
  const extracted = raw.extracted ?? ({} as ApplicationFromJdResponse["extracted"]);

  const normalized: ApplicationFromJdResponse = {
    extracted: {
      company: cleanString(extracted.company),
      position: cleanString(extracted.position),

      location: cleanString(extracted.location),
      locationDetails: cleanString(extracted.locationDetails),

      workMode: cleanEnum(extracted.workMode, WORK_MODE_VALUES),
      workModeDetails: cleanString(extracted.workModeDetails),

      jobType: cleanEnum(extracted.jobType, JOB_TYPE_VALUES),
      jobTypeDetails: cleanString(extracted.jobTypeDetails),

      salaryText: cleanString(extracted.salaryText),
      salaryDetails: cleanString(extracted.salaryDetails),
      jobLink: cleanString(extracted.jobLink),
      tagsText: normalizeTagsText(extracted.tagsText),

      notes: cleanStringArray(extracted.notes, 20),
    },
    ai: {
      jdSummary: cleanString(raw.ai?.jdSummary) ?? "(No summary provided)",
      warnings: cleanStringArray(raw.ai?.warnings, 10) || undefined,
    },
  };

  // Remove undefined keys to keep the payload clean.
  Object.keys(normalized.extracted).forEach((k) => {
    const key = k as keyof typeof normalized.extracted;
    if (normalized.extracted[key] === undefined) delete normalized.extracted[key];
  });

  return normalized;
}



// ---------------- FIT_V1 ----------------

export type FitConfidence = "low" | "medium" | "high";

export type FitV1Response = {
  score: number; // 0–100
  confidence: FitConfidence;
  strengths: string[];
  gaps: string[];
  keywordGaps: string[];
  recommendedEdits: string[];
  questionsToAsk: string[];
};

export const FitV1JsonObject = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "confidence",
    "strengths",
    "gaps",
    "keywordGaps",
    "recommendedEdits",
    "questionsToAsk",
  ],
  properties: {
    score: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    strengths: { type: "array", items: { type: "string" }, maxItems: 10 },
    gaps: { type: "array", items: { type: "string" }, maxItems: 10 },
    keywordGaps: { type: "array", items: { type: "string" }, maxItems: 15 },
    recommendedEdits: { type: "array", items: { type: "string" }, maxItems: 10 },
    questionsToAsk: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
} as const;


// ------------ FIT_V1 HELPER FUNCTIONS ------------

// Output bounds (cost-control later)
const JD_EXTRACT_MAX_OUTPUT_TOKENS = 900;
const FIT_MAX_OUTPUT_TOKENS = 10000;


// Tiered caps for FIT. Kept high enough to avoid truncation.
export const FIT_MAX_OUTPUT_TOKENS_BY_TIER: Record<AiTier, number> = {
  regular: 10000,
  pro: 12000,
  admin: 15000,
};

type FitVerbosity = "low" | "medium" | "high";
type FitEffort = "low" | "medium" | "high" | "xhigh";

type FitPolicy = {
  tier: AiTier;
  model: string;
  verbosity: FitVerbosity;
  effort: FitEffort;
  maxOutputTokens: number;
};

/**
 * Central place to decide FIT model + settings by tier.
 * Keep these conservative and predictable for cost control.
 */
export function getFitPolicyForTier(tier: AiTier): FitPolicy {
  if (tier === "admin") {
    return {
      tier,
      model: "gpt-5.2",
      verbosity: "medium",
      effort: "high",
      maxOutputTokens: FIT_MAX_OUTPUT_TOKENS_BY_TIER.admin,
    };
  }

  if (tier === "pro") {
    return {
      tier,
      model: "gpt-5-mini",
      verbosity: "high",
      effort: "medium",
      maxOutputTokens: FIT_MAX_OUTPUT_TOKENS_BY_TIER.pro,
    };
  }

  // regular
  return {
    tier: "regular",
    model: "gpt-5-mini",
    verbosity: "medium",
    effort: "medium", // start low to reduce reasoning-token blowups
    maxOutputTokens: FIT_MAX_OUTPUT_TOKENS_BY_TIER.regular,
  };
}

export type FitV1RunResult = {
  payload: FitV1Response;
  model: string; // the model we actually requested
  tier: AiTier;
};

// Helper: clamp score into 0–100 (and round)
function clampFitScore(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Helper: normalize confidence with safe fallback
function cleanFitConfidence(v: unknown): FitConfidence {
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

// Helper: dedupe (case-insensitive) while keeping order + cap
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
 * Normalizes FIT_V1 output to be stable and UI-friendly:
 * - clamps score 0–100
 * - trims and removes empty strings
 * - dedupes obvious duplicates
 * - caps list sizes
 */
export function normalizeFitV1Response(raw: FitV1Response): FitV1Response {
  return {
    score: clampFitScore(raw.score),
    confidence: cleanFitConfidence(raw.confidence),
    strengths: dedupeAndCap(cleanStringArray(raw.strengths, 20), 7),
    gaps: dedupeAndCap(cleanStringArray(raw.gaps, 20), 7),
    keywordGaps: dedupeAndCap(cleanStringArray(raw.keywordGaps, 30), 12),
    recommendedEdits: dedupeAndCap(cleanStringArray(raw.recommendedEdits, 20), 7),
    questionsToAsk: dedupeAndCap(cleanStringArray(raw.questionsToAsk, 20), 5),
  };
}





