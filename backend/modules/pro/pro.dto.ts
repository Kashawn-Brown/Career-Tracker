// Centralized select for "latest request" UI state (keep it lean)

export const aiProRequestSummarySelect = {
    id: true,
    status: true,
    requestedAt: true,
    decidedAt: true,
  } as const;
  