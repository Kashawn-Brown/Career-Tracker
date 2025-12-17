import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming auth requests.
 */


export const RegisterBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
    name: Type.String({ minLength: 1, maxLength: 100 }),
  },
  { additionalProperties: false }
);

export const LoginBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

export type RegisterBodyType = Static<typeof RegisterBody>;
export type LoginBodyType = Static<typeof LoginBody>;
