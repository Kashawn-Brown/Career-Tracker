import { Type, Static } from "@sinclair/typebox";

/**
 * Schemas for Fastify to validate incoming auth requests.
 */

/**
 * Request body for registering a user.
 */
export const RegisterBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
    name: Type.String({ minLength: 1, maxLength: 100 }),
  },
  { additionalProperties: false }
);

/**
 * Request body for user login.
 */
export const LoginBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);


export const EmptyBody = Type.Object({}, { additionalProperties: false });


export type RegisterBodyType = Static<typeof RegisterBody>;
export type LoginBodyType = Static<typeof LoginBody>;
export type EmptyBodyType = Static<typeof EmptyBody>;
