import { UserPlan, UserRole } from "@prisma/client";

/**
 * Centralized select for admin user list.
 * Minimal shape: enough to display + manage users without leaking sensitive fields.
 */
export const adminUserSelect = {
  id:           true,
  email:        true,
  name:         true,
  role:         true,
  plan:         true,
  isActive:     true,
  createdAt:    true,
  updatedAt:    true,
  lastActiveAt: true,
  // Include current cycle for real credit display and pending request badge
  planUsageCycles: {
    select:  { usedCredits: true, baseCredits: true, bonusCredits: true, cycleYear: true, cycleMonth: true },
    orderBy: [{ cycleYear: "desc" as const }, { cycleMonth: "desc" as const }],
    take:    1,
  },
  // Pending credit request indicator (at most one shown in the UI)
  planRequests: {
    select: { id: true, status: true },
    where:  { status: "PENDING" },
    take:   1,
  },
};

/**
 * Shape of a single user item returned by GET /admin/users.
 */
export type AdminUserListItem = {
  id:           string;
  email:        string;
  name:         string;
  role:         UserRole;
  plan:         UserPlan;
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
  lastActiveAt: Date | null;
  // Current cycle usage (empty array if no cycle started yet)
  planUsageCycles: { usedCredits: number; baseCredits: number; bonusCredits: number; cycleYear: number; cycleMonth: number }[];
  // Pending credit request indicator
  planRequests: { id: string; status: string }[];
};

export type AdminUsersListResponse = {
  items:      AdminUserListItem[];
  page:       number;
  pageSize:   number;
  total:      number;
  totalPages: number;
};

export type AdminUserDetail = AdminUserListItem & {
  applicationCount: number;
  connectionCount:  number;
  statusBreakdown:  Record<string, number>;
};