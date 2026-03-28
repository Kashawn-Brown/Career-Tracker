  import { UserPlan, UserRole } from "@prisma/client";

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
} as const;

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