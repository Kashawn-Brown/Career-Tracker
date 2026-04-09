"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminUserDetail, AdminUserListItem, UserPlan, AdminUserAnalyticsResponse, AdminProRequestEntry } from "@/types/api";
import { analyticsApi } from "@/lib/api/analytics";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AI_FREE_QUOTA } from "@/lib/constants";

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
  const [proActing, setProActing]           = useState<Record<string, boolean>>({});
  const [proNotes, setProNotes]             = useState<Record<string, string>>({});
  const [proError, setProError]             = useState<string | null>(null);

  // Confirm state: null = no confirm showing, otherwise holds the pending action
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [isActing, setIsActing]           = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Load detail when sheet opens for a user
  useEffect(() => {
    if (!open || !user) {
      setDetail(null);
      setAiUsage(null);
      setProError(null);
      setProNotes({});
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

      // Load AI usage separately — non-blocking so sheet still opens if it fails
      setAiUsageLoading(true);
      analyticsApi.getAdminUserAnalytics(user!.id, "all")
        .then(setAiUsage)
        .catch(() => {}) // non-fatal
        .finally(() => setAiUsageLoading(false));
    }

    void load();
  }, [open, user]);

  async function handleProAction(requestId: string, action: "approve" | "deny" | "credits") {
    if (!user) return;
    setProActing((m) => ({ ...m, [requestId]: true }));
    setProError(null);
    try {
      const note = proNotes[requestId]?.trim() || undefined;
      if (action === "approve") await adminApi.approveProRequest(requestId, { decisionNote: note });
      else if (action === "deny") await adminApi.denyProRequest(requestId, { decisionNote: note });
      else await adminApi.grantCredits(requestId);
      setProNotes((m) => ({ ...m, [requestId]: "" }));
      // Reload detail to reflect updated request status
      const res = await adminApi.getUserDetail(user.id);
      setDetail(res);
      onUserUpdated();
    } catch (err) {
      setProError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setProActing((m) => ({ ...m, [requestId]: false }));
    }
  }

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

            {/* --- Pro Requests --- */}
            {(detail.proRequests ?? []).length > 0 && (
              <Section title="Pro Requests">
                {proError && (
                  <div className="text-xs text-red-600 mb-2">{proError}</div>
                )}
                <div className="space-y-3">
                  {(detail.proRequests ?? []).map((r: AdminProRequestEntry) => (
                    <div key={r.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(r.requestedAt).toLocaleDateString()}
                          {r.decidedAt ? ` → ${new Date(r.decidedAt).toLocaleDateString()}` : ""}
                        </span>
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          r.status === "PENDING"  ? "border-amber-300 text-amber-700 dark:text-amber-400" :
                          r.status === "APPROVED" ? "border-green-300 text-green-700 dark:text-green-400" :
                          r.status === "DENIED"   ? "border-red-300 text-red-600" :
                          "border-muted text-muted-foreground"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      {r.note && (
                        <p className="text-xs text-muted-foreground">{r.note}</p>
                      )}
                      {r.decisionNote && (
                        <p className="text-xs text-muted-foreground italic">Note: {r.decisionNote}</p>
                      )}
                      {r.status === "PENDING" && !isAdmin && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Decision note (optional)"
                            value={proNotes[r.id] ?? ""}
                            onChange={(e) => setProNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              disabled={!!proActing[r.id]}
                              onClick={() => handleProAction(r.id, "approve")}
                            >
                              {proActing[r.id] ? "..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!proActing[r.id]}
                              onClick={() => handleProAction(r.id, "deny")}
                            >
                              Deny
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!proActing[r.id]}
                              onClick={() => handleProAction(r.id, "credits")}
                            >
                              Grant credits
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

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
                          // variant="outline"
                          className={
                            "Regular" === PLAN_LABELS[p] ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200" 
                            : "Pro" === PLAN_LABELS[p] ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                            : "Pro+" === PLAN_LABELS[p] ? "bg-blue-600 text-white hover:bg-blue-700"
                            : ""}
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