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

    // Optional because it can default to server-side.
    status: Type.Optional(ApplicationStatusSchema),

    location: Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),

    // Accept ISO date-time strings over the wire. (convert to Date in the service)
    dateApplied: Type.Optional(Type.String({ format: "date-time" })),

    jobType: Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    workMode: Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 200 })),

    salaryText: Type.Optional(Type.String({ maxLength: 200 })),

    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    description: Type.Optional(Type.String({ maxLength: 20000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),
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
    status: Type.Optional(ApplicationStatusSchema),  // status filter
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),  // text search filter (company or position)

    jobType: Type.Optional(JobTypeSchema),  // job type filter
    workMode: Type.Optional(WorkModeSchema),  // work mode filter

    // Querystrings arrive as strings, so accept "true"/"false" and parse to boolean in the route.
    isFavorite: Type.Optional(Type.Union([Type.Literal("true"), Type.Literal("false")])),  // starred filter

    // Pagination
    page: Type.Optional(Type.Integer({ minimum: 1 })),          // default in route/service
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })), // cap to prevent abuse
    
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
        Type.Literal("isFavorite")
      ])
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
    location: Type.Optional(Type.String({ maxLength: 200 })),
    locationDetails: Type.Optional(Type.String({ maxLength: 500 })),
    dateApplied: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])), // ISO string or null to clear
    jobType: Type.Optional(JobTypeSchema),
    jobTypeDetails: Type.Optional(Type.String({ maxLength: 200 })),
    workMode: Type.Optional(WorkModeSchema),
    workModeDetails: Type.Optional(Type.String({ maxLength: 200 })),
    salaryText: Type.Optional(Type.String({ maxLength: 200 })),
    isFavorite: Type.Optional(Type.Boolean()),
    jobLink: Type.Optional(Type.String({ maxLength: 2048 })),
    tagsText: Type.Optional(Type.String({ maxLength: 500 })),
    description: Type.Optional(Type.String({ maxLength: 20000 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
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
  Type.Literal("OTHER"),
]);

// Query params for uploading a document to an application
export const UploadApplicationDocumentQuery = Type.Object(
  {
    kind: Type.Optional(ApplicationDocumentKindSchema),
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


export type UploadApplicationDocumentQueryType = Static<typeof UploadApplicationDocumentQuery>;


