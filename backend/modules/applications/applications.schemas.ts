import { Type, Static } from "@sinclair/typebox";

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


// Model status as a strict union of allowed values. (aligns with Prisma enum)
export const ApplicationStatusSchema = Type.Union([
  Type.Literal("WISHLIST"),
  Type.Literal("APPLIED"),
  Type.Literal("INTERVIEW"),
  Type.Literal("OFFER"),
  Type.Literal("REJECTED"),
  Type.Literal("WITHDRAWN"),
]);


// Request body for creating an application.
export const CreateApplicationBody = Type.Object(
  {
    company: Type.String({ minLength: 1, maxLength: 200 }),
    position: Type.String({ minLength: 1, maxLength: 200 }),

    // Optional because it can default to server-side.
    status: Type.Optional(ApplicationStatusSchema),

    // Accept ISO date-time strings over the wire. (convert to Date in the service)
    dateApplied: Type.Optional(Type.String({ format: "date-time" })),

    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    description: Type.Optional(Type.String({ maxLength: 20000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
  },
  { additionalProperties: false }
);


// Query params for listing applications.
// Basic filtering only (status + text search)
export const ListApplicationsQuery = Type.Object(
  {
    status: Type.Optional(ApplicationStatusSchema),
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  },
  { additionalProperties: false }  // stops random extra fields from sneaking in
);


// TS types derived from the schemas (keeps TS and validation in sync)
// Gives real TS types that matches the schema exactly
export type CreateApplicationBodyType = Static<typeof CreateApplicationBody>;
export type ListApplicationsQueryType = Static<typeof ListApplicationsQuery>;
export type ApplicationStatusType = Static<typeof ApplicationStatusSchema>;



