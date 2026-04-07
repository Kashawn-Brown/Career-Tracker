import { Type, Static } from "@sinclair/typebox";
import { ApplicationStatus, JobType, WorkMode } from "@prisma/client";

/**
 * Schemas for Fastify to validate incoming requests.
 * 
 * Serves 2 jobs:
 * 1) Runtime validation (Fastify rejects bad input automatically)
 * 2) A single source of truth for what the API accepts
 *
 * Static<> then converts the schema into a TypeScript type
 * so our route/service code stays strongly typed.
 */


// Application status schema derived from Prisma enum.
export const ApplicationStatusSchema = Type.Enum(ApplicationStatus);

// Job type schema derived from Prisma enum.
export const JobTypeSchema = Type.Enum(JobType);

// Work mode schema derived from Prisma enum.
export const WorkModeSchema = Type.Enum(WorkMode);

/**
 * Request body for creating an application.
 */
export const CreateApplicationBody = Type.Object(
  {
    company: Type.String({ minLength: 1, maxLength: 200 }),
    position: Type.String({ minLength: 1, maxLength: 200 }),

    isFavorite: Type.Optional(Type.Boolean()),

    // Optional because it can default to server-side.
    status: Type.Optional(ApplicationStatusSchema),

    location: Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),

    // Accept ISO date-time strings over the wire. (convert to Date in the service)
    dateApplied: Type.Optional(Type.String({ format: "date-time" })),

    jobType: Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 500 })),

    workMode: Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    salaryText: Type.Optional(Type.String({ maxLength: 200 })),
    salaryDetails: Type.Optional(Type.String({ maxLength: 500 })),

    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
    // AI-generated summary stored at create time when JD extraction is used
    jdSummary: Type.Optional(Type.String({ maxLength: 2000 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false }
);


/**
 * Query params for listing applications.
 * Supports both legacy single-value filters and new multi-value (CSV) filters.
 * If plural (multi-value) filters are present, they take precedence.
 */
export const ListApplicationsQuery = Type.Object(
  {
    // Text search
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),

    // Legacy single-value filters (kept for backward compatibility)
    status:   Type.Optional(ApplicationStatusSchema),
    jobType:  Type.Optional(JobTypeSchema),
    workMode: Type.Optional(WorkModeSchema),

    // Multi-value filters (CSV strings, e.g. "APPLIED,INTERVIEW")
    // These take precedence over the singular filters above when present.
    statuses:  Type.Optional(Type.String({ maxLength: 200 })),
    jobTypes:  Type.Optional(Type.String({ maxLength: 200 })),
    workModes: Type.Optional(Type.String({ maxLength: 200 })),

    // Favorites filter
    isFavorite: Type.Optional(
      Type.Union([Type.Literal("true"), Type.Literal("false")])
    ),

    // Fit score range
    fitMin: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
    fitMax: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),

    // Date range filters (ISO date-time strings)
    dateAppliedFrom: Type.Optional(Type.String({ format: "date-time" })),
    dateAppliedTo:   Type.Optional(Type.String({ format: "date-time" })),
    updatedFrom:     Type.Optional(Type.String({ format: "date-time" })),
    updatedTo:       Type.Optional(Type.String({ format: "date-time" })),

    // Pagination
    page:     Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),

    // Sorting
    sortBy: Type.Optional(
      Type.Union([
        Type.Literal("updatedAt"),
        Type.Literal("createdAt"),
        Type.Literal("company"),
        Type.Literal("position"),
        Type.Literal("location"),
        Type.Literal("status"),
        Type.Literal("dateApplied"),
        Type.Literal("jobType"),
        Type.Literal("workMode"),
        Type.Literal("salaryText"),
        Type.Literal("isFavorite"),
        Type.Literal("fitScore"),
      ])
    ),
    sortDir: Type.Optional(
      Type.Union([Type.Literal("asc"), Type.Literal("desc")])
    ),
  },
  { additionalProperties: false }
);


/**
 * Exportable column id schema — validated against the allowed set.
 */
export const ApplicationExportColumnSchema = Type.Union([
  Type.Literal("favorite"),
  Type.Literal("company"),
  Type.Literal("position"),
  Type.Literal("location"),
  Type.Literal("jobType"),
  Type.Literal("salaryText"),
  Type.Literal("workMode"),
  Type.Literal("status"),
  Type.Literal("fitScore"),
  Type.Literal("dateApplied"),
  Type.Literal("updatedAt"),
]);

/**
 * Query params for CSV export.
 * Reuses the same filter/sort params as the list endpoint.
 * No page/pageSize — export always fetches all matching rows.
 * Optional columns CSV param controls which columns appear in the output.
 */
export const ExportApplicationsQuery = Type.Object(
  {
    // Same filters as list (copy without page/pageSize)
    status:   Type.Optional(ApplicationStatusSchema),
    jobType:  Type.Optional(JobTypeSchema),
    workMode: Type.Optional(WorkModeSchema),
    statuses:  Type.Optional(Type.String({ maxLength: 200 })),
    jobTypes:  Type.Optional(Type.String({ maxLength: 200 })),
    workModes: Type.Optional(Type.String({ maxLength: 200 })),
    isFavorite: Type.Optional(
      Type.Union([Type.Literal("true"), Type.Literal("false")])
    ),
    fitMin: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
    fitMax: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
    dateAppliedFrom: Type.Optional(Type.String({ format: "date-time" })),
    dateAppliedTo:   Type.Optional(Type.String({ format: "date-time" })),
    updatedFrom:     Type.Optional(Type.String({ format: "date-time" })),
    updatedTo:       Type.Optional(Type.String({ format: "date-time" })),
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),

    // Sorting
    sortBy: Type.Optional(
      Type.Union([
        Type.Literal("updatedAt"),
        Type.Literal("createdAt"),
        Type.Literal("company"),
        Type.Literal("position"),
        Type.Literal("location"),
        Type.Literal("status"),
        Type.Literal("dateApplied"),
        Type.Literal("jobType"),
        Type.Literal("workMode"),
        Type.Literal("salaryText"),
        Type.Literal("isFavorite"),
        Type.Literal("fitScore"),
      ])
    ),
    sortDir: Type.Optional(
      Type.Union([Type.Literal("asc"), Type.Literal("desc")])
    ),

    // Export-specific: CSV of column ids to include
    columns: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false }
);



/**
 * Schema for the :id in the URL (route params) -> the :id in the URL (route params)
 */
export const ApplicationIdParams = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);


/**
 * Request PATCH body for partial update on applications
 */
export const UpdateApplicationBody = Type.Object(
  {
    // Partial update so all fields are optional to be changed
    company: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    position: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    status: Type.Optional(ApplicationStatusSchema),
    location: Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),
    dateApplied: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])), // ISO string or null to clear
    jobType: Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 500 })),
    workMode: Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 200 })),
    salaryText: Type.Optional(Type.String({ maxLength: 200 })),
    salaryDetails: Type.Optional(Type.String({ maxLength: 500 })),
    isFavorite: Type.Optional(Type.Boolean()),
    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),
    description: Type.Optional(Type.String({ maxLength: 100_000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
    // AI-generated summary stored at create time when JD extraction is used
    jdSummary: Type.Optional(Type.String({ maxLength: 2000 })),
  },
  { additionalProperties: false }
);

/**
 * Documents v1:
 * For application attachments small subset of document kinds allowed.
 * (BASE_RESUME stays profile-only.)
 */
export const ApplicationDocumentKindSchema = Type.Union([
  Type.Literal("RESUME"),
  Type.Literal("COVER_LETTER"),
  Type.Literal("CAREER_HISTORY"),  // (AI Only)
  Type.Literal("OTHER"),
]);

// Query params for uploading a document to an application
export const UploadApplicationDocumentQuery = Type.Object(
  {
    kind: Type.Optional(ApplicationDocumentKindSchema),
  },
  { additionalProperties: false }
);



/** CONNECTIONS : */

/**
 * Schema for the :id and :connectionId in the URL (route params) -> the :id and :connectionId in the URL (route params)
 */
export const ApplicationConnectionParams = Type.Object(
  {
    id: Type.String({ minLength: 1 }), // application id
    connectionId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);



/** AI ARTIFACTS : */

export const AiArtifactKindSchema = Type.Union([
  Type.Literal("JD_EXTRACT_V1"),
  Type.Literal("FIT_V1"),
  Type.Literal("RESUME_ADVICE"),
  Type.Literal("COVER_LETTER"),
  Type.Literal("INTERVIEW_PREP"),
]);

export const GenerateAiArtifactBody = Type.Object(
  {
    kind: AiArtifactKindSchema,

    // Optional override document id
    sourceDocumentId: Type.Optional(Type.Integer({ minimum: 1 })),

    // Optional template text — used for COVER_LETTER targeted generation
    templateText: Type.Optional(Type.String({ maxLength: 5000 })),

    // When true, skip the stored base cover letter template even if one exists.
    // Lets the user explicitly opt out for a specific run.
    skipBaseCoverLetterTemplate: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const ListAiArtifactsQuery = Type.Object(
  {
    kind: Type.Optional(AiArtifactKindSchema),
    all: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);


// TS types derived from the schemas (keeps TS and validation in sync)
// Gives real TS types that matches the schema exactly
export type CreateApplicationBodyType = Static<typeof CreateApplicationBody>;
export type ListApplicationsQueryType = Static<typeof ListApplicationsQuery>;
export type ExportApplicationsQueryType = Static<typeof ExportApplicationsQuery>;
export type ApplicationIdParamsType = Static<typeof ApplicationIdParams>;
export type UpdateApplicationBodyType = Static<typeof UpdateApplicationBody>;
export type ApplicationStatusType = Static<typeof ApplicationStatusSchema>;

export type UploadApplicationDocumentQueryType = Static<typeof UploadApplicationDocumentQuery>;

export type GenerateAiArtifactBodyType = Static<typeof GenerateAiArtifactBody>;
export type ListAiArtifactsQueryType = Static<typeof ListAiArtifactsQuery>;

export type AiArtifactKindType = Static<typeof AiArtifactKindSchema>;