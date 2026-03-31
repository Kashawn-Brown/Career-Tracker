import { Type, Static } from "@sinclair/typebox";
import { JobType, WorkMode } from "@prisma/client";

/**
 * Schemas for Fastify to validate incoming requests and outgoing responses.
 */

export const WorkModeSchema = Type.Enum(WorkMode);
export const JobTypeSchema  = Type.Enum(JobType);

export const AiArtifactKindSchema = Type.Union([
  Type.Literal("JD_EXTRACT_V1"),
  Type.Literal("FIT_V1"),
]);


// ─── EXTRACT JOB DESCRIPTION ──────────────────────────────────────────────────

/**
 * Schema for the extracted fields from the job description.
 */
export const ApplicationDraftSchema = Type.Object(
  {
    company:  Type.Optional(Type.String({ maxLength: 200 })),
    position: Type.Optional(Type.String({ maxLength: 200 })),

    location:        Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),

    workMode:        Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 500 })),

    jobType:        Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    salaryText:    Type.Optional(Type.String({ maxLength: 200 })),
    salaryDetails: Type.Optional(Type.String({ maxLength: 500 })),

    jobLink:  Type.Optional(Type.String({ maxLength: 2048 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),

    notes: Type.Optional(Type.Array(Type.String({ maxLength: 300 }), { maxItems: 20 })),
  },
  { additionalProperties: false }
);

/**
 * Canonical source metadata returned alongside every draft response.
 * Tells the frontend where the text came from and carries the cleaned
 * job-posting text so it can be stored as the application description.
 */
export const DraftSourceSchema = Type.Object(
  {
    mode:            Type.Union([Type.Literal("TEXT"), Type.Literal("LINK")]),
    canonicalJdText: Type.String({ maxLength: 200_000 }),
    sourceUrl:       Type.Optional(Type.String({ maxLength: 2048 })),
  },
  { additionalProperties: false }
);

/**
 * Body of the POST /ai/application-from-jd request.
 */
export const JdBody = Type.Object(
  {
    text: Type.String({ minLength: 1, maxLength: 100_000 }),
  },
  { additionalProperties: false }
);

/**
 * Body of the POST /ai/application-from-link request.
 */
export const JobLinkBody = Type.Object(
  {
    url: Type.String({ minLength: 1, maxLength: 2048 }),
  },
  { additionalProperties: false }
);

/**
 * Response body for both draft-generation routes.
 * Includes `source` so the frontend always receives canonical JD text
 * regardless of whether extraction came from pasted text or a URL.
 */
export const ApplicationDraftResponse = Type.Object(
  {
    extracted: ApplicationDraftSchema,
    ai: Type.Object(
      {
        jdSummary: Type.String({ minLength: 1, maxLength: 2000 }),
        warnings:  Type.Optional(
          Type.Array(Type.String({ minLength: 1, maxLength: 300 }), { maxItems: 10 })
        ),
      },
      { additionalProperties: false }
    ),
    source: DraftSourceSchema,
  },
  { additionalProperties: false }
);


export type JdBodyType       = Static<typeof JdBody>;
export type JobLinkBodyType  = Static<typeof JobLinkBody>;
export type ApplicationDraftResponseType = Static<typeof ApplicationDraftResponse>;