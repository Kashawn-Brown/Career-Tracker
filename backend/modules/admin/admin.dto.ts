// Centralized select for Admin requests

export const proRequestsSelect = {
    id: true,
    status: true,
    note: true,
    decisionNote: true,
    requestedAt: true,
    decidedAt: true,
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        aiProEnabled: true,
      },
    },
  } as const;