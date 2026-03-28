import { Type, Static } from "@sinclair/typebox";
import { UserPlan, UserRole } from "@prisma/client";

/**
 * Body for making a decision on a Pro request.
 */
export const ProDecisionBody = Type.Object(
  {
    decisionNote: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

/**
 * Query params for listing users (admin).
 */
export const ListUsersQuery = Type.Object(
  {
    q:       Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    role:    Type.Optional(Type.Enum(UserRole)),
    plan:    Type.Optional(Type.Enum(UserPlan)),
    page:    Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
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
 * Body for updating a user's plan (admin).
 */
export const UpdateUserPlanBody = Type.Object(
  {
    plan: Type.Enum(UserPlan),
  },
  { additionalProperties: false }
);

// Derived TS types
export type ProDecisionBodyType = Static<typeof ProDecisionBody>;
export type ListUsersQueryType     = Static<typeof ListUsersQuery>;
export type AdminUserIdParamsType  = Static<typeof AdminUserIdParams>;
export type UpdateUserPlanBodyType = Static<typeof UpdateUserPlanBody>;