import { JobType, WorkMode } from "@prisma/client";

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
    jobLink?: string;
  };
  ai: {
    jdSummary: string;
    noteworthyNotes: string[];
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
      properties: {
        company: { type: "string" },
        position: { type: "string" },

        location: { type: "string" },
        locationDetails: { type: "string" },

        workMode: { type: "string", enum: WORK_MODE_VALUES },
        workModeDetails: { type: "string" },

        jobType: { type: "string", enum: JOB_TYPE_VALUES },
        jobTypeDetails: { type: "string" },

        salaryText: { type: "string" },
        jobLink: { type: "string" },
      },
    },
    ai: {
      type: "object",
      additionalProperties: false,
      required: ["jdSummary", "noteworthyNotes"],
      properties: {
        jdSummary: { type: "string" },
        noteworthyNotes: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;



// ------------ HELPER FUNCTIONS ------------

// Helper function to clean a string. (trim and remove empty strings)
function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : undefined;
}

// Helper function to clean an array of strings. (trim and remove empty strings)
function cleanStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanString(x))
    .filter((x): x is string => Boolean(x))
    .slice(0, max);
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

      workMode: extracted.workMode === WorkMode.UNKNOWN ? undefined : extracted.workMode,
      workModeDetails: cleanString(extracted.workModeDetails),

      jobType: extracted.jobType === JobType.UNKNOWN ? undefined : extracted.jobType,
      jobTypeDetails: cleanString(extracted.jobTypeDetails),

      salaryText: cleanString(extracted.salaryText),
      jobLink: cleanString(extracted.jobLink),
    },
    ai: {
      jdSummary: cleanString(raw.ai?.jdSummary) ?? "(No summary provided)",
      noteworthyNotes: cleanStringArray(raw.ai?.noteworthyNotes, 20),
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
