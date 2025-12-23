import { Type, Static } from "@sinclair/typebox";
import { ApplicationStatus } from "@prisma/client";

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


/**
 * Request body for creating an application.
 */
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



/**
 * Query params for listing applications.
 * Pagination and Sorting for listing applications.
 * Basic filtering only (status + text search)
 */
export const ListApplicationsQuery = Type.Object(
  {
    status: Type.Optional(ApplicationStatusSchema),
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),

    // Pagination
    page: Type.Optional(Type.Integer({ minimum: 1 })),          // default in route/service
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })), // cap to prevent abuse

    // Sorting
    sortBy: Type.Optional(
      Type.Union([Type.Literal("updatedAt"), Type.Literal("createdAt"), Type.Literal("company")])
    ),
    sortDir: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),

  },
  { additionalProperties: false }  // stops random extra fields from sneaking in
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
    dateApplied: Type.Optional(Type.String({ format: "date-time" })), // ISO string
    jobLink: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
    description: Type.Optional(Type.String({ maxLength: 20000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
  },
  { additionalProperties: false }
);


// TS types derived from the schemas (keeps TS and validation in sync)
// Gives real TS types that matches the schema exactly
export type CreateApplicationBodyType = Static<typeof CreateApplicationBody>;
export type ListApplicationsQueryType = Static<typeof ListApplicationsQuery>;
export type ApplicationIdParamsType = Static<typeof ApplicationIdParams>;
export type UpdateApplicationBodyType = Static<typeof UpdateApplicationBody>;
export type ApplicationStatusType = Static<typeof ApplicationStatusSchema>;



