import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming Pro request bodies.
 * 
 * - User requesting Pro access (note optional).
 */
export const RequestProBody = Type.Object(
  {
    note: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type RequestProBodyType = Static<typeof RequestProBody>;

/**
 * Schemas for Fastify to validate incoming Admin approve Pro request bodies.
 * 
 * - Admin approving Pro access for a userId.
 */
export const AdminApproveProBody = Type.Object(
  {
    userId: Type.String({ minLength: 1 }),
    decisionNote: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type AdminApproveProBodyType = Static<typeof AdminApproveProBody>;

/**
 * Schemas for Fastify to validate incoming Admin deny Pro request bodies.
 * 
 * - Admin denying Pro access for a userId (cooldownDays optional).
 */
export const AdminDenyProBody = Type.Object(
  {
    userId: Type.String({ minLength: 1 }),
    cooldownDays: Type.Optional(Type.Integer({ minimum: 1, maximum: 365 })),
    decisionNote: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type AdminDenyProBodyType = Static<typeof AdminDenyProBody>;
