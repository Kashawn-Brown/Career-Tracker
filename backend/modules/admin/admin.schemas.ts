import { Type, Static } from "@sinclair/typebox";
import { UserPlan, UserRole } from "@prisma/client";

/**
 * Query params for listing users (admin).
 */
export const ListUsersQuery = Type.Object(
  {
    q:                 Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    role:              Type.Optional(Type.Enum(UserRole)),
    plan:              Type.Optional(Type.Enum(UserPlan)),
    isActive:          Type.Optional(Type.Boolean()),
    hasPendingRequest: Type.Optional(Type.Boolean()),
    sortBy:            Type.Optional(Type.Union([
      Type.Literal("lastActiveAt"),
      Type.Literal("createdAt"),
    ])),
    sortDir:           Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
    page:              Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize:          Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  },
  { additionalProperties: false }
);

/**
 * Route params for a specific user (admin).
 */
export const AdminUserIdParams = Type.Object(
  {
    userId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/**
 * Route params for a specific user + request (admin).
 */
export const AdminUserRequestParams = Type.Object(
  {
    userId:    Type.String({ minLength: 1 }),
    requestId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/**
 * Body for updating a user's plan (admin).
 */
export const UpdateUserPlanBody = Type.Object(
  {
    plan: Type.Enum(UserPlan),
  },
  { additionalProperties: false }
);

/**
 * Body for updating a user's active status (admin).
 */
export const UpdateUserStatusBody = Type.Object(
  {
    isActive: Type.Boolean(),
  },
  { additionalProperties: false }
);

/**
 * Body for adding bonus credits to a user.
 */
export const AdminAddCreditsBody = Type.Object(
  {
    credits: Type.Integer({ minimum: 1, maximum: 10_000 }),
    note:    Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

// Derived TS types
export type ListUsersQueryType        = Static<typeof ListUsersQuery>;
export type AdminUserIdParamsType     = Static<typeof AdminUserIdParams>;
export type AdminUserRequestParamsType = Static<typeof AdminUserRequestParams>;
export type UpdateUserPlanBodyType    = Static<typeof UpdateUserPlanBody>;
export type UpdateUserStatusBodyType  = Static<typeof UpdateUserStatusBody>;
export type AdminAddCreditsBodyType   = Static<typeof AdminAddCreditsBody>;