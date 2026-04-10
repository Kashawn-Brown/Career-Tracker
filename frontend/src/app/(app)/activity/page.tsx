"use client";

import { useCallback, useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api/analytics";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { UserActivityOverviewResponse, UsageState, UsageThreshold, DateWindow } from "@/types/api";

const TOOL_LABELS: Record<string, string> = {
  JD_EXTRACTION:     "JD Extraction",
  FIT:               "Compatibility Check",
  RESUME_HELP:       "Resume Advice (Generic)",
  COVER_LETTER_HELP: "Cover Letter (Generic)",
  RESUME_ADVICE:     "Resume Advice (Targeted)",
  COVER_LETTER:      "Cover Letter (Targeted)",
  INTERVIEW_PREP:    "Interview Prep",
};

const EVENT_LABELS: Record<string, string> = {
  APPLICATION_CREATED:       "Created an application",
  APPLICATION_UPDATED:       "Updated an application",
  APPLICATION_DELETED:       "Deleted an application",
  APPLICATIONS_CSV_EXPORTED: "Exported applications to CSV",
  AI_RUN_STARTED:            "Started an AI run",
  AI_RUN_SUCCEEDED:          "Completed an AI run",
  AI_RUN_FAILED:             "AI run failed",
  ARTIFACT_VIEWED:           "Viewed a saved result",
  ARTIFACT_COPIED:           "Copied a result",
};

function toolLabel(kind: string) { return TOOL_LABELS[kind] ?? kind; }
function fmt(n: number) { return n.toLocaleString(); }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityPage() {
  const [window, setWindow]       = useState<DateWindow>("30d");
  const [data, setData]           = useState<UserActivityOverviewResponse | null>(null);
  const [usage, setUsage]         = useState<UsageState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overview, usageState] = await Promise.all([
        analyticsApi.getMyOverview(window),
        analyticsApi.getMyUsage(),
      ]);
      setData(overview);
      setUsage(usageState);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load activity.");
    } finally {
      setIsLoading(false);
    }
  }, [window]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

      {/* Header — filter moved below summary cards intentionally */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A summary of what you have done and the AI tools you have used.
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {isLoading && !data && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}

      {data && (
        <>
          {/* Summary cards — all-time totals, unaffected by the period filter below */}
          <section>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard
                title="Applications tracked"
                value={fmt(data.applicationCount)}
              />
              <SummaryCard
                title="AI runs completed"
                value={fmt(data.totalSuccessfulRuns)}
              />
              <SummaryCard
                title="Targeted artifacts"
                value={fmt(data.artifacts.targeted)}
                sub="From drawer tools"
              />
              <SummaryCard
                title="Saved results"
                value={fmt(data.artifacts.generic)}
                sub="From Tools page"
              />
            </div>
          </section>

          {/* Period filter — positioned here so it visually governs the activity
              sections below, not the all-time totals above */}
          <div className="flex items-center gap-3 justify-end mb-4">
            <div className="flex gap-1 rounded-md border p-0.5 bg-muted ">
              {(["1d", "7d", "30d", "1y", "all"] as DateWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    window === w
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {w === "1d" ? "Today" : w === "7d" ? "7 days" : w === "30d" ? "30 days" : w === "1y" ? "1 year" : "All time"}
                </button>
              ))}
            </div>
          </div>

          {/* AI usage by tool */}
          {data.byTool.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                AI tools used
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2 space-y-3">
                  {data.byTool.map((row) => {
                    const max = data.byTool[0].count;
                    const pct = Math.round((row.count / max) * 100);
                    return (
                      <div key={row.toolKind}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{toolLabel(row.toolKind)}</span>
                          <span className="tabular-nums font-medium text-muted-foreground">
                            {fmt(row.count)} {row.count === 1 ? "run" : "runs"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Recent AI runs */}
          {data.recentRuns.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent AI runs
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRuns.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2">{toolLabel(r.toolKind)}</td>
                          <td className="py-2 text-muted-foreground capitalize">
                            {r.scope === "GENERIC" ? "Tools page" : r.scope === "EXTRACTION" ? "Extraction" : "Application"}
                          </td>
                          <td className="py-2">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-2 text-right text-muted-foreground tabular-nums">
                            {timeAgo(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Recent product events */}
          {data.recentEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent actions
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <div className="divide-y">
                    {data.recentEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-muted-foreground">
                          {EVENT_LABELS[e.eventType] ?? e.eventType.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-4">
                          {timeAgo(e.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Empty state */}
          {data.totalSuccessfulRuns === 0 && data.recentEvents.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No activity recorded yet. Start by adding an application or running an AI tool.
              </p>
            </div>
          )}
        </>
      )}

      {usage && <UsageCard usage={usage} />}

    </div>
  );
}

function SummaryCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── UsageCard ────────────────────────────────────────────────────────────────

const THRESHOLD_STYLES: Record<UsageThreshold, { bar: string; text: string; bg: string }> = {
  OK:         { bar: "bg-primary",    text: "text-muted-foreground",                bg: "" },
  WARNING_75: { bar: "bg-amber-500",  text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" },
  WARNING_90: { bar: "bg-orange-500", text: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" },
  BLOCKED:    { bar: "bg-red-500",    text: "text-red-700 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" },
};

const THRESHOLD_MESSAGES: Partial<Record<UsageThreshold, string>> = {
  WARNING_75: "You have used 75% of your monthly credits.",
  WARNING_90: "You are running low — 90% of your monthly credits used.",
  BLOCKED:    "You have reached your monthly credit limit.",
};

function UsageCard({ usage }: { usage: UsageState }) {
  const styles    = THRESHOLD_STYLES[usage.threshold];
  const message   = THRESHOLD_MESSAGES[usage.threshold];
  const resetDate = new Date(usage.resetAt).toLocaleDateString(undefined, {
    month: "long", day: "numeric",
  });

  return (
    <Card className={usage.threshold !== "OK" ? `border ${styles.bg}` : ""}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>AI credits · {usage.plan}</span>
          <span className={`text-xs font-normal ${styles.text}`}>Resets {resetDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="tabular-nums font-medium">
              {fmt(usage.usedCredits)}
              <span className="text-muted-foreground font-normal"> / {fmt(usage.totalCredits)} credits used</span>
            </span>
            <span className={`text-xs font-medium ${styles.text}`}>{fmt(usage.remaining)} remaining</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${styles.bar}`}
              style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
            />
          </div>
        </div>

        {message && (
          <p className={`text-xs ${styles.text}`}>
            {message}
            {usage.isBlocked && (
              <>{" "}Your credits will reset on {resetDate}. You can request more credits or upgrade to Pro from your profile.</>
            )}
          </p>
        )}

        {usage.bonusCredits > 0 && (
          <p className="text-xs text-muted-foreground">
            Includes {fmt(usage.bonusCredits)} bonus credits added by admin.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCEEDED: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    FAILED:    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    STARTED:   "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };
  const labels: Record<string, string> = {
    SUCCEEDED: "Completed",
    FAILED:    "Failed",
    STARTED:   "In progress",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {labels[status] ?? status}
    </span>
  );
}