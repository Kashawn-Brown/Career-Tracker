"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUserDetail, AdminUserListItem, UserPlan } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AI_FREE_QUOTA } from "@/lib/constants";

const PLAN_LABELS: Record<UserPlan, string> = {
  REGULAR:  "Regular",
  PRO:      "Pro",
  PRO_PLUS: "Pro+",
};

const STATUS_LABELS: Record<string, string> = {
  WISHLIST:  "Wishlist",
  APPLIED:   "Applied",
  INTERVIEW: "Interview",
  OFFER:     "Offer",
  REJECTED:  "Rejected",
  WITHDRAWN: "Withdrawn",
};

type ConfirmAction =
  | { type: "plan";   plan: UserPlan }
  | { type: "status"; isActive: boolean };

type Props = {
  user: AdminUserListItem | null;
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
};

export function UserDetailSheet({ user, open, onClose, onUserUpdated }: Props) {
  const [detail, setDetail]       = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Confirm state: null = no confirm showing, otherwise holds the pending action
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [isActing, setIsActing]           = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Load detail when sheet opens for a user
  useEffect(() => {
    if (!open || !user) {
      setDetail(null);
      setPendingAction(null);
      setActionError(null);
      return;
    }

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminApi.getUserDetail(user!.id);
        setDetail(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load user details.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [open, user]);

  async function confirmAction() {
    if (!pendingAction || !user) return;

    setIsActing(true);
    setActionError(null);

    try {
      if (pendingAction.type === "plan") {
        await adminApi.updateUserPlan(user.id, pendingAction.plan);
      } else {
        await adminApi.updateUserStatus(user.id, pendingAction.isActive);
      }

      setPendingAction(null);
      onUserUpdated(); // refresh the parent list

      // Reload detail to reflect changes
      const res = await adminApi.getUserDetail(user.id);
      setDetail(res);

    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setIsActing(false);
    }
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user?.name ?? "User"}</SheetTitle>
          <SheetDescription>{user?.email}</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="pt-8 text-center text-sm text-muted-foreground">Loading...</div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">{error}</Alert>
        )}

        {!isLoading && detail && (
          <div className="mt-6 space-y-6">

            {/* --- Overview --- */}
            <Section title="Overview">
              <Field label="Role"        value={detail.role} />
              <Field label="Plan"        value={PLAN_LABELS[detail.plan]} />
              <Field label="Status"      value={detail.isActive ? "Active" : "Inactive"} />
              <Field label="AI Credits"  value={`${detail.aiFreeUsesUsed} / ${AI_FREE_QUOTA} used`} />
              <Field label="Last Active" value={detail.lastActiveAt ? fmtDate(detail.lastActiveAt) : "Never"} />
              <Field label="Member Since" value={fmtDate(detail.createdAt)} />
            </Section>

            {/* --- Activity stats --- */}
            <Section title="Activity">
              <Field label="Total Applications" value={String(detail.applicationCount)} />
              
              {/* Status breakdown as sub-details under applications */}
              {detail.applicationCount > 0 && (
                <div className="mt-1 ml-2 space-y-1 border-l-2 border-muted pl-3">
                  {Object.entries(detail.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Connections" value={String(detail.connectionCount)} />
            </Section>

            {/* --- Usage (placeholder for future tracking) --- */}
            <Section title="AI Usage">
              <div className="text-xs text-muted-foreground italic">
                Detailed usage tracking coming soon — will include AI features used
                broken down by type, total tokens consumed, and more.
              </div>
            </Section>

            {/* --- Actions (blocked for admins) --- */}
            {isAdmin ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Actions are not available for admin accounts.
              </div>
            ) : (
              <>
                {/* Plan actions */}
                <Section title="Change Plan">
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(["REGULAR", "PRO", "PRO_PLUS"] as UserPlan[])
                      .filter((p) => p !== detail.plan)
                      .map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingAction({ type: "plan", plan: p })}
                        >
                          Set {PLAN_LABELS[p]}
                        </Button>
                      ))}
                  </div>
                </Section>

                {/* Account status */}
                <Section title="Account Status">
                  <Button
                    size="sm"
                    variant="outline"
                    className={detail.isActive
                      ? "border-red-200 text-red-700 hover:bg-red-50"
                      : "border-green-200 text-green-700 hover:bg-green-50"
                    }
                    onClick={() =>
                      setPendingAction({ type: "status", isActive: !detail.isActive })
                    }
                  >
                    {detail.isActive ? "Deactivate Account" : "Activate Account"}
                  </Button>
                </Section>
              </>
            )}

            {actionError && (
              <Alert variant="destructive">{actionError}</Alert>
            )}

            {/* --- Confirmation prompt --- */}
            {pendingAction && (
              <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">
                  {pendingAction.type === "plan"
                    ? `Set plan to ${PLAN_LABELS[pendingAction.plan]} for ${detail.name}?`
                    : pendingAction.isActive
                      ? `Activate account for ${detail.name}?`
                      : `Deactivate account for ${detail.name}?`
                  }
                </p>
                <p className="text-xs text-muted-foreground">This action takes effect immediately.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isActing}
                    onClick={confirmAction}
                  >
                    {isActing ? "Saving..." : "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isActing}
                    onClick={() => setPendingAction(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// --- Small helpers ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="rounded-md border bg-muted/10 p-3 space-y-2">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString(undefined, {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}