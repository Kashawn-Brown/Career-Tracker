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
    password: Type.String({ minLength: 8, maxLength: 72 }),
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

/**
 * Request body for email verification.
 * 
 * When a user clicks on the verification link in the email, they will be redirected to this endpoint with the token.
 */
export const VerifyEmailBody = Type.Object(
  {
    token: Type.String({ minLength: 20, maxLength: 200 }),
  },
  { additionalProperties: false }
);

/**
 * Request body for resending a verification email.
 * 
 * When a user requests a new verification email, they will be redirected to this endpoint with their email.
 */
export const ResendVerificationBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
  },
  { additionalProperties: false }
);


export const EmptyBody = Type.Object({}, { additionalProperties: false });


export type RegisterBodyType = Static<typeof RegisterBody>;
export type LoginBodyType = Static<typeof LoginBody>;
export type EmptyBodyType = Static<typeof EmptyBody>;
export type VerifyEmailBodyType = Static<typeof VerifyEmailBody>;
export type ResendVerificationBodyType = Static<typeof ResendVerificationBody>;

