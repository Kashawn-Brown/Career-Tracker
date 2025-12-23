import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming profile requests.
 */


/**
 * Defines the shape of the request body for updating profile
 */
export const UpdateMeBody = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false }
);

export type UpdateMeBodyType = Static<typeof UpdateMeBody>;


