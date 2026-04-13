// Centralized select for "latest plan request" UI state (keep it lean)

export const planRequestSummarySelect = {
    id: true,
    status: true,
    requestType: true,
    planAtRequest: true,
    requestedAt: true,
    decidedAt: true,
  } as const;