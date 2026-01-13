import { Type, Static } from "@sinclair/typebox";
import { WorkMode } from "@prisma/client";

/**
 * Schemas for Fastify to validate incoming profile requests.
 */

// Work mode schema derived from Prisma enum.
const WorkModeSchema = Type.Enum(WorkMode);

/**
 * Defines the shape of the request body for updating profile.
 * All fields are optional so the client can PATCH a subset.
 */
export const UpdateMeBody = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),

    location: Type.Optional(Type.String({ maxLength: 120 })),
    currentRole: Type.Optional(Type.String({ maxLength: 120 })),
    currentCompany: Type.Optional(Type.String({ maxLength: 120 })),

    // Skills stored as a string array
    skills: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 50 }), { maxItems: 50 })
    ),

    linkedInUrl: Type.Optional(Type.String({ maxLength: 300 })),
    githubUrl: Type.Optional(Type.String({ maxLength: 300 })),
    portfolioUrl: Type.Optional(Type.String({ maxLength: 300 })),

    // Job search preferences (AI foundation)
    jobSearchTitlesText: Type.Optional(Type.String({ maxLength: 500 })),
    jobSearchLocationsText: Type.Optional(Type.String({ maxLength: 500 })),
    jobSearchKeywordsText: Type.Optional(Type.String({ maxLength: 500 })),
    jobSearchSummary: Type.Optional(Type.String({ maxLength: 2000 })),
    jobSearchWorkMode: Type.Optional(WorkModeSchema),

  },
  { additionalProperties: false }
);

export type UpdateMeBodyType = Static<typeof UpdateMeBody>;


