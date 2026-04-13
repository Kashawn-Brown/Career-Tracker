import { Type, Static } from "@sinclair/typebox";

/**
 * User requesting more AI credits (note optional).
 */
export const RequestCreditsBody = Type.Object(
  {
    note: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type RequestCreditsBodyType = Static<typeof RequestCreditsBody>;