
// Centralized “public” shapes returned to API clients.
// Keeps Prisma selects consistent and prevents leaking future fields.

export const userSelect = {
  id: true,
  email: true,
  name: true,
  baseResumeUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;


