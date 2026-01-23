import { userSelect } from "../user/user.dto.js";

// Centralized “public” shapes returned to API clients for auth endpoints.
// Keeps Prisma selects consistent and prevents leaking future fields.
export const authUserSelect = userSelect;

// Login needs passwordHash for credential checks.
// IMPORTANT: passwordHash must never be returned to clients.
export const authLoginSelect = {
  ...userSelect,
  passwordHash: true,
} as const;

// Types used by the service layer
export type CreateAuthSessionOptions = {
  expiresInDays?: number;
};

export type SessionTokens = {
  refreshToken: string;
  csrfToken: string;
  expiresAt: Date;
};
