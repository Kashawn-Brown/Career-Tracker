import { Type, Static } from "@sinclair/typebox";
import { JobType, WorkMode } from "@prisma/client";

/**
 * Schemas for Fastify to validate incoming requests.
 */

// Schemas for the WorkMode and JobType enums.
export const WorkModeSchema = Type.Enum(WorkMode);
export const JobTypeSchema = Type.Enum(JobType);

/**
 * Schema for the extracted fields from the job description.
 */
export const ApplicationDraftSchema = Type.Object(
  {
    company: Type.Optional(Type.String({ maxLength: 200 })),
    position: Type.Optional(Type.String({ maxLength: 200 })),

    location: Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),

    workMode: Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    jobType: Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    salaryText: Type.Optional(Type.String({ maxLength: 200 })),
    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),

    notes: Type.Optional(Type.Array(Type.String({ maxLength: 300 }), { maxItems: 20 })),
  },
  { additionalProperties: false }
);


/**
 * Body of the POST request to build an application draft from a job description.
 */
export const JdBody = Type.Object(
  {
    // Allow large pasted JDs
    text: Type.String({ minLength: 1, maxLength: 100_000 }),
  },
  { additionalProperties: false }
);

/**
 * Response body for the POST request to build an application draft from a job description.
 */
export const ApplicationDraftResponse = Type.Object(
  {
    extracted: ApplicationDraftSchema,
    ai: Type.Object(
      {
        jdSummary: Type.String({ minLength: 1, maxLength: 2000 }),
        warnings: Type.Optional(
          Type.Array(Type.String({ minLength: 1, maxLength: 300 }), { maxItems: 10 })
        ),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

export type JdBodyType = Static<typeof JdBody>;
export type ApplicationDraftResponseType = Static<typeof ApplicationDraftResponse>;
