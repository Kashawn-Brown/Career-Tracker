
// Centralized “public” shapes returned to API clients.
// Keeps Prisma selects consistent and prevents leaking future fields.

export const userSelect = {
  id: true,
  email: true,
  name: true,

  baseResumeUrl: true,

  // Profile fields
  location: true,
  currentRole: true,
  currentCompany: true,
  skills: true,
  linkedInUrl: true,
  githubUrl: true,
  portfolioUrl: true,

  // Job search preferences (AI foundation)
  jobSearchTitlesText: true,
  jobSearchLocationsText: true,
  jobSearchKeywordsText: true,
  jobSearchSummary: true,
  jobSearchWorkMode: true,

  // AI access control
  aiProEnabled: true,
  aiFreeUsesUsed: true,

  createdAt: true,
  updatedAt: true,

  emailVerifiedAt: true,

} as const;


