"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUserDetail, AdminUserListItem, UserPlan, AdminUserAnalyticsResponse, UsageState } from "@/types/api";
import { analyticsApi } from "@/lib/api/analytics";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";


const TOOL_LABELS: Record<string, string> = {
  JD_EXTRACTION:     "JD Extraction",
  FIT:               "Compatibility Check",
  RESUME_HELP:       "Resume Advice (Generic)",
  COVER_LETTER_HELP: "Cover Letter (Generic)",
  RESUME_ADVICE:     "Resume Advice (Targeted)",
  COVER_LETTER:      "Cover Letter (Targeted)",
  INTERVIEW_PREP:    "Interview Prep",
};

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
  const [detail, setDetail]           = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [aiUsage, setAiUsage]               = useState<AdminUserAnalyticsResponse | null>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);
  const [usageState, setUsageState]         = useState<UsageState | null>(null);
  const [usageLoading, setUsageLoading]     = useState(false);
  const [creditAmount, setCreditAmount]     = useState("10");
  const [creditNote, setCreditNote]         = useState("");
  const [creditActing, setCreditActing]     = useState(false);
  const [creditError, setCreditError]       = useState<string | null>(null);
  const [declining, setDeclining]           = useState(false);

  // Confirm state: null = no confirm showing, otherwise holds the pending action
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [isActing, setIsActing]           = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Load detail when sheet opens for a user
  useEffect(() => {
    if (!open || !user) {
      setDetail(null);
      setAiUsage(null);
      setUsageState(null);
      setCreditAmount("10");
      setCreditNote("");
      setCreditError(null);
      setDeclining(false);
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

      // Load AI usage separately — non-blocking
      setAiUsageLoading(true);
      analyticsApi.getAdminUserAnalytics(user!.id, "all")
        .then(setAiUsage)
        .catch(() => {})
        .finally(() => setAiUsageLoading(false));

      // Load plan usage state
      setUsageLoading(true);
      adminApi.getUserUsage(user!.id)
        .then(setUsageState)
        .catch(() => {})
        .finally(() => setUsageLoading(false));
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

  async function handleAddCredits() {
    if (!user) return;
    const amount = parseInt(creditAmount, 10);
    if (!amount || amount < 1) return;
    setCreditActing(true);
    setCreditError(null);
    try {
      await adminApi.addUserCredits(user.id, amount, creditNote.trim() || undefined);
      setCreditAmount("10");
      setCreditNote("");
      const updated = await adminApi.getUserUsage(user.id);
      setUsageState(updated);
      // Reload detail so the pending request badge clears
      const res = await adminApi.getUserDetail(user.id);
      setDetail(res);
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Failed to add credits.");
    } finally {
      setCreditActing(false);
    }
  }

  async function handleResetCredits() {
    if (!user) return;
    setCreditActing(true);
    setCreditError(null);
    try {
      await adminApi.resetUserCredits(user.id);
      const updated = await adminApi.getUserUsage(user.id);
      setUsageState(updated);
      // Reload detail so the pending request badge clears
      const res = await adminApi.getUserDetail(user.id);
      setDetail(res);
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Failed to reset credits.");
    } finally {
      setCreditActing(false);
    }
  }

  async function handleDeclineRequest(requestId: string) {
    if (!user) return;
    setDeclining(true);
    try {
      await adminApi.declinePlanRequest(user.id, requestId);
      // Reload detail so the pending request badge clears
      const res = await adminApi.getUserDetail(user.id);
      setDetail(res);
    } catch {
      // Non-fatal — badge will stay visible, admin can retry
    } finally {
      setDeclining(false);
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
              <Field label="Credits used" value={usageState ? `${usageState.usedCredits} / ${usageState.totalCredits} (${usageState.remaining} remaining)` : usageLoading ? "Loading..." : "—"} />
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

            {/* --- AI Usage --- */}
            <Section title="AI Usage">
              {aiUsageLoading && (
                <div className="text-xs text-muted-foreground">Loading...</div>
              )}
              {!aiUsageLoading && aiUsage && (
                <div className="space-y-2">
                  <Field
                    label="Total runs"
                    value={String(aiUsage.aiRuns.byStatus.reduce((s, r) => s + r.count, 0))}
                  />
                  <Field
                    label="Successful"
                    value={String(aiUsage.aiRuns.byStatus.find((r) => r.status === "SUCCEEDED")?.count ?? 0)}
                  />
                  <Field
                    label="Failed"
                    value={String(aiUsage.aiRuns.byStatus.find((r) => r.status === "FAILED")?.count ?? 0)}
                  />
                  <Field
                    label="Artifacts generated"
                    value={String(aiUsage.artifacts.targeted + aiUsage.artifacts.generic)}
                  />
                  {/* Per-tool breakdown */}
                  {aiUsage.aiRuns.byTool.length > 0 && (
                    <div className="mt-1 ml-2 space-y-1 border-l-2 border-muted pl-3">
                      {Object.entries(
                        aiUsage.aiRuns.byTool.reduce<Record<string, number>>((acc, r) => {
                          if (r.status === "SUCCEEDED") acc[r.toolKind] = (acc[r.toolKind] ?? 0) + r.count;
                          return acc;
                        }, {})
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([kind, count]) => (
                          <div key={kind} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{TOOL_LABELS[kind] ?? kind}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="pt-1">
                    <a
                      href={`/admin/users/${detail?.id}/analytics`}
                      className="text-xs text-primary hover:underline"
                    >
                      View full usage breakdown →
                    </a>
                  </div>
                </div>
              )}
              {!aiUsageLoading && !aiUsage && (
                <div className="text-xs text-muted-foreground">No usage data available.</div>
              )}
            </Section>

            {/* --- Credits & Access (blocked for admins) --- */}
            {isAdmin ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Actions are not available for admin accounts.
              </div>
            ) : (
              <>
                <Section title="Credits & Access">
                  <div className="space-y-4">

                    {/* Current cycle summary */}
                    {usageState ? (
                      <div className="text-xs text-muted-foreground">
                        Current cycle: <span className="text-foreground font-medium">{usageState.usedCredits} / {usageState.totalCredits}</span> used ({usageState.remaining} remaining) · resets {new Date(usageState.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    ) : usageLoading ? (
                      <div className="text-xs text-muted-foreground">Loading usage…</div>
                    ) : null}

                    {/* Pending credit request — admin can decline or act via controls below */}
                    {(detail.planRequests ?? []).filter((r) => r.status === "PENDING").length > 0 && (() => {
                      const pending = (detail.planRequests ?? []).find((r) => r.status === "PENDING")!;
                      return (
                        <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Credit request pending</span>
                              <span className="text-muted-foreground">{"·"}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(pending.requestedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                              disabled={declining}
                              onClick={() => handleDeclineRequest(pending.id)}
                            >
                              {declining ? "…" : "Decline"}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Past requests (non-pending) */}
                    {(detail.planRequests ?? []).filter((r) => r.status !== "PENDING").length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground font-medium">Past requests</div>
                        {(detail.planRequests ?? [])
                          .filter((r) => r.status !== "PENDING")
                          .map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(r.requestedAt).toLocaleDateString()}</span>
                            <span className={
                              r.status === "APPROVED" ? "text-green-600"    :
                              r.status === "DECLINED" ? "text-red-500"      :
                              ""
                            }>{r.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Add credits manually</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="w-20 rounded border bg-background px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={creditNote}
                          onChange={(e) => setCreditNote(e.target.value)}
                          className="flex-1 rounded border bg-background px-2 py-1 text-xs"
                        />
                        <Button size="sm" disabled={creditActing} onClick={handleAddCredits}>
                          {creditActing ? "…" : "Add credits"}
                        </Button>
                      </div>
                      <Button size="sm" variant="outline" disabled={creditActing} onClick={handleResetCredits}>
                        Reset credits
                      </Button>
                      {creditError && (
                        <p className="text-xs text-destructive">{creditError}</p>
                      )}
                    </div>

                    {/* Change plan — secondary, tucked at the bottom */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Change plan</div>
                      <div className="flex flex-wrap gap-2">
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
                    </div>

                  </div>
                </Section>

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

                {/* Account status */}
                <Section title="Account Status">
                  <Button
                    size="sm"
                    variant="outline"
                    className={detail.isActive
                      ? "border-red-200 text-red-700 hover:bg-red-50"
                      : "border-green-200 text-green-700 hover:bg-green-50"
                    }
                    onClick={() => setPendingAction({ type: "status", isActive: !detail.isActive })}
                  >
                    {detail.isActive ? "Deactivate Account" : "Activate Account"}
                  </Button>
                </Section>
              </>
            )}

            {actionError && (
              <Alert variant="destructive">{actionError}</Alert>
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