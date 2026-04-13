"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUserListItem, UserPlan, UserRole } from "@/types/api";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Credit allowances per plan — mirrors backend MONTHLY_CREDITS
const PLAN_CREDITS: Record<UserPlan, number> = {
  REGULAR:  100,
  PRO:      1200,
  PRO_PLUS: 1200,
};

const PLAN_OPTIONS: { value: UserPlan | "ALL"; label: string }[] = [
  { value: "ALL",      label: "All plans" },
  { value: "REGULAR",  label: "Regular"   },
  { value: "PRO",      label: "Pro"       },
  { value: "PRO_PLUS", label: "Pro+"      },
];

const ROLE_OPTIONS: { value: UserRole | "ALL"; label: string }[] = [
  { value: "ALL",   label: "All roles" },
  { value: "USER",  label: "User"      },
  { value: "ADMIN", label: "Admin"     },
];

const STATUS_OPTIONS = [
  { value: "ALL",      label: "All statuses" },
  { value: "active",   label: "Active"       },
  { value: "inactive", label: "Inactive"     },
];

const PLAN_LABELS: Record<UserPlan, string> = {
  REGULAR:  "Regular",
  PRO:      "Pro",
  PRO_PLUS: "Pro+",
};

type SortField = "lastActiveAt" | "createdAt";
type SortDir   = "asc" | "desc";

export default function AdminUsersPage() {
  return (
    <RequireAdmin>
      <AdminUsersContent />
    </RequireAdmin>
  );
}

function AdminUsersContent() {
  const [users, setUsers]                     = useState<AdminUserListItem[]>([]);
  const [total, setTotal]                     = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // Filters
  const [q, setQ]                             = useState("");
  const [planFilter, setPlanFilter]           = useState<UserPlan | "ALL">("ALL");
  const [roleFilter, setRoleFilter]           = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter]       = useState<"ALL" | "active" | "inactive">("ALL");
  const [pendingOnly, setPendingOnly]         = useState(false);

  // Sort
  const [sortBy,  setSortBy]  = useState<SortField>("lastActiveAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Sheet
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [sheetOpen, setSheetOpen]       = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({
        q:                 q.trim() || undefined,
        plan:              planFilter === "ALL"      ? undefined : planFilter,
        role:              roleFilter === "ALL"      ? undefined : roleFilter,
        isActive:          statusFilter === "ALL"    ? undefined : statusFilter === "active",
        hasPendingRequest: pendingOnly               || undefined,
        sortBy,
        sortDir,
      });
      setUsers(res.items);
      setTotal(res.total);
      setPendingRequests(res.pendingRequestCount ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [q, planFilter, roleFilter, statusFilter, pendingOnly, sortBy, sortDir]);

  useEffect(() => { void load(); }, [load]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function handleRowClick(user: AdminUserListItem) {
    if (user.role === "ADMIN") return;
    setSelectedUser(user);
    setSheetOpen(true);
  }

  function creditDisplay(user: AdminUserListItem) {
    const cycle = user.planUsageCycles?.[0];
    const max   = PLAN_CREDITS[user.plan] ?? 100;
    const used  = cycle ? cycle.usedCredits : 0;
    return `${used} / ${max}`;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Users</h1>
          {pendingRequests > 0 && (
            <button
              type="button"
              onClick={() => setPendingOnly((v) => !v)}
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                pendingOnly
                  ? "bg-amber-500 text-white dark:bg-amber-600"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40",
              ].join(" ")}
            >
              {pendingRequests} pending credit request{pendingRequests !== 1 ? "s" : ""}
              {pendingOnly ? " ×" : ""}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {total} user{total !== 1 ? "s" : ""} total
          {pendingOnly && <span className="ml-1 text-amber-600">· filtered to pending requests</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <Select
          id="planFilter"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as UserPlan | "ALL")}
          className="w-36"
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
        <Select
          id="roleFilter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "ALL")}
          className="w-32"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>
        <Select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "active" | "inactive")}
          className="w-36"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">AI Credits</th>
                <SortableHeader label="Last Active" field="lastActiveAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Joined"      field="createdAt"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
              {!isLoading && users.map((user) => {
                const isAdmin    = user.role === "ADMIN";
                const hasPending = user.planRequests?.length > 0;
                return (
                  <tr
                    key={user.id}
                    className={[
                      "border-b last:border-0 transition-colors",
                      isAdmin ? "opacity-60" : "cursor-pointer hover:bg-muted/20",
                    ].join(" ")}
                    onClick={() => handleRowClick(user)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        </div>
                        {hasPending && (
                          <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-xs font-medium leading-none">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.role}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{PLAN_LABELS[user.plan]}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{creditDisplay(user)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.lastActiveAt ? fmtDate(user.lastActiveAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={user.isActive ? "text-green-600" : "text-muted-foreground"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedUser(null); }}
        onUserUpdated={load}
      />
    </div>
  );
}

// ── Sortable column header ────────────────────────────────────────────────────
function SortableHeader({
  label, field, sortBy, sortDir, onSort,
}: {
  label:   string;
  field:   SortField;
  sortBy:  SortField;
  sortDir: SortDir;
  onSort:  (f: SortField) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="text-left px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active
          ? sortDir === "asc"
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        }
      </button>
    </th>
  );
}

function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString(undefined, {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}