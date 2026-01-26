import { Type, Static } from "@sinclair/typebox";

/**
 * User requesting Pro access (note optional).
 */
export const RequestProBody = Type.Object(
  {
    note: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  },
  { additionalProperties: false }
);

export type RequestProBodyType = Static<typeof RequestProBody>;
