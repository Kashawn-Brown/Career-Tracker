import { UserPlan, UserRole, AiProRequestStatus } from "@prisma/client";

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
      plan: true,
    },
  },
} as const;

/**
 * Centralized select for admin user list.
 * Minimal shape: enough to display + manage users without leaking sensitive fields.
 */
export const adminUserSelect = {
  id:             true,
  email:          true,
  name:           true,
  role:           true,
  plan:           true,
  isActive:       true,
  aiFreeUsesUsed: true,
  createdAt:      true,
  updatedAt:      true,
  lastActiveAt:   true,
  // Include current cycle for real credit display and pending request badge
  planUsageCycles: {
    select: { usedCredits: true, baseCredits: true, bonusCredits: true, cycleYear: true, cycleMonth: true },
    orderBy: [{ cycleYear: "desc" as const }, { cycleMonth: "desc" as const }],
    take: 1,
  },
  aiProRequests: {
    select: { id: true, status: true },
    where:  { status: AiProRequestStatus.PENDING },
    take:   1,
  },
};

/**
 * Shape of a single user item returned by GET /admin/users.
 */
export type AdminUserListItem = {
  id:             string;
  email:          string;
  name:           string;
  role:           UserRole;
  plan:           UserPlan;
  isActive:       boolean;
  aiFreeUsesUsed: number;
  createdAt:      Date;
  updatedAt:      Date;
  lastActiveAt:   Date | null;
  // Current cycle usage (null if no cycle started yet)
  planUsageCycles: { usedCredits: number; baseCredits: number; bonusCredits: number; cycleYear: number; cycleMonth: number }[];
  // Pending pro request indicator
  aiProRequests:   { id: number; status: string }[];
};

export type AdminUsersListResponse = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminUserDetail = AdminUserListItem & {
  applicationCount:  number;
  connectionCount:   number;
  statusBreakdown:   Record<string, number>;
};