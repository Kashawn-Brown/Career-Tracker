import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming requests.
 * Runtime validation + TS types derived from the schemas.
 */

/**
 * Schema for the :id in the URL (route params) -> the :id in the URL (route params)
 */
export const ConnectionIdParams = Type.Object(
  { id: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
);

/**
 * Schema for the body of the POST /api/v1/connections request -> the body of the POST /api/v1/connections request
 */
export const CreateConnectionBody = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    company: Type.Optional(Type.String({ maxLength: 200 })),
    title: Type.Optional(Type.String({ maxLength: 200 })),
    email: Type.Optional(Type.String({ maxLength: 320 })), // keep it simple (no strict email format for MVP)
    linkedInUrl: Type.Optional(Type.String({ maxLength: 2048 })),
    phone: Type.Optional(Type.String({ maxLength: 50 })),
    relationship: Type.Optional(Type.String({ maxLength: 80 })),
    location: Type.Optional(Type.String({ maxLength: 200 })),
    status: Type.Optional(Type.Boolean()),    
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
  },
  { additionalProperties: false }
);

/**
 * Schema for the body of the PATCH /api/v1/connections/:id request -> the body of the PATCH /api/v1/connections/:id request
 */
export const UpdateConnectionBody = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    company: Type.Optional(Type.String({ maxLength: 200 })),
    title: Type.Optional(Type.String({ maxLength: 200 })),
    email: Type.Optional(Type.String({ maxLength: 320 })),
    linkedInUrl: Type.Optional(Type.String({ maxLength: 2048 })),
    notes: Type.Optional(Type.String({ maxLength: 20000 })),
    phone: Type.Optional(Type.String({ maxLength: 50 })),
    relationship: Type.Optional(Type.String({ maxLength: 80 })),
    location: Type.Optional(Type.String({ maxLength: 200 })),
    status: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

/**
 * Schema for the query string of the GET /api/v1/connections request -> the query string of the GET /api/v1/connections request
 */
export const ListConnectionsQuery = Type.Object(
  {
    // Basic text search across name, company, title, email, phone
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    
    // Optional filters
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    company: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    relationship: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    status: Type.Optional(Type.Boolean()),

    // Pagination
    page: Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),

    // Sorting
    sortBy: Type.Optional(
      Type.Union([
        Type.Literal("updatedAt"),
        Type.Literal("createdAt"),
        Type.Literal("name"),
        Type.Literal("company"),
        Type.Literal("title"),
        Type.Literal("relationship"),
        Type.Literal("location"),
      ])
    ),
    sortDir: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
  },
  { additionalProperties: false }
);

export type ConnectionIdParamsType = Static<typeof ConnectionIdParams>;
export type CreateConnectionBodyType = Static<typeof CreateConnectionBody>;
export type UpdateConnectionBodyType = Static<typeof UpdateConnectionBody>;
export type ListConnectionsQueryType = Static<typeof ListConnectionsQuery>;
