"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUserListItem, UserPlan } from "@/types/api";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_FREE_QUOTA } from "@/lib/constants";

const PLAN_OPTIONS: { value: UserPlan | "ALL"; label: string }[] = [
  { value: "ALL",      label: "All plans"  },
  { value: "REGULAR",  label: "Regular"    },
  { value: "PRO",      label: "Pro"        },
  { value: "PRO_PLUS", label: "Pro+"       },
];

const PLAN_LABELS: Record<UserPlan, string> = {
  REGULAR:  "Regular",
  PRO:      "Pro",
  PRO_PLUS: "Pro+",
};

export default function AdminUsersPage() {
  return (
    <RequireAdmin>
      <AdminUsersContent />
    </RequireAdmin>
  );
}

function AdminUsersContent() {
  const [users, setUsers]         = useState<AdminUserListItem[]>([]);
  const [total, setTotal]         = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [q, setQ]           = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlan | "ALL">("ALL");

  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
  
    try {
      const res = await adminApi.listUsers({
        q,
        plan: planFilter === "ALL" ? undefined : planFilter,
      });
  
      setUsers(res.items.filter((u) => u.role !== "ADMIN"));
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [q, planFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePlanChange(userId: string, plan: UserPlan) {
    setUpdatingId(userId);
    setUpdateError(null);
    try {
      await adminApi.updateUserPlan(userId, plan);
      // Refresh list after update
      await load();
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : "Failed to update plan.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} user{total !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          id="planFilter"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as UserPlan | "ALL")}
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {error      && <Alert variant="destructive">{error}</Alert>}
      {updateError && <Alert variant="destructive">{updateError}</Alert>}

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
                <th className="text-left px-4 py-3 font-medium">AI Credits Used</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
              {!isLoading && users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-muted-foreground text-xs">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{PLAN_LABELS[user.plan]}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.aiFreeUsesUsed}/{AI_FREE_QUOTA}
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isActive ? "text-green-600" : "text-muted-foreground"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* {user.plan === "REGULAR" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          disabled={updatingId === user.id}
                          onClick={() => handlePlanChange(user.id, "REGULAR")}
                        >
                          Grant 5 AI Credits
                        </Button>
                      )} */}
                      {user.plan !== "REGULAR" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          disabled={updatingId === user.id}
                          onClick={() => handlePlanChange(user.id, "REGULAR")}
                        >
                          Set Regular
                        </Button>
                      )}
                      {user.plan !== "PRO" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          disabled={updatingId === user.id}
                          onClick={() => handlePlanChange(user.id, "PRO")}
                        >
                          Set Pro
                        </Button>
                      )}
                      {user.plan !== "PRO_PLUS" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-indigo-600 text-white hover:bg-indigo-700"
                          disabled={updatingId === user.id}
                          onClick={() => handlePlanChange(user.id, "PRO_PLUS")}
                        >
                          Set Pro+
                        </Button>
                      )}
                      
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}