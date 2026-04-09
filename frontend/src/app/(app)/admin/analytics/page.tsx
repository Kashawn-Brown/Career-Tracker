"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { analyticsApi } from "@/lib/api/analytics";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type {
  AdminOverviewResponse,
  AdminAiUsageResponse,
  AdminActivityResponse,
  DateWindow,
} from "@/types/api";

export default function AdminAnalyticsPage() {
  return (
    <RequireAdmin>
      <AdminAnalyticsContent />
    </RequireAdmin>
  );
}

// ─── Label helpers ────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  JD_EXTRACTION:    "JD Extraction",
  FIT:              "Compatibility Check",
  RESUME_HELP:      "Resume Advice (Generic)",
  COVER_LETTER_HELP: "Cover Letter (Generic)",
  RESUME_ADVICE:    "Resume Advice (Targeted)",
  COVER_LETTER:     "Cover Letter (Targeted)",
  INTERVIEW_PREP:   "Interview Prep",
};

const STATUS_LABELS: Record<string, string> = {
  STARTED:   "In progress",
  SUCCEEDED: "Succeeded",
  FAILED:    "Failed",
};

function toolLabel(kind: string) {
  return TOOL_LABELS[kind] ?? kind;
}

function fmt(n: number) {
  return n.toLocaleString();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AdminAnalyticsContent() {
  const [window, setWindow]     = useState<DateWindow>("30d");
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [aiUsage, setAiUsage]   = useState<AdminAiUsageResponse | null>(null);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ov, ai, act] = await Promise.all([
        analyticsApi.getAdminOverview(window),
        analyticsApi.getAdminAiUsage(window),
        analyticsApi.getAdminActivity(),
      ]);
      setOverview(ov);
      setAiUsage(ai);
      setActivity(act);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [window]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

      {/* Header + window filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Product usage, AI consumption, and artifact activity.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5 bg-muted text-sm">
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

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading && !overview && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}

      {/* Overview summary cards */}
      {overview && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard title="Total users"        value={fmt(overview.users.total)}        sub={`+${fmt(overview.users.new)} new`} />
            <SummaryCard title="Total applications" value={fmt(overview.applications.total)} sub={`+${fmt(overview.applications.new)} new`} />
            <SummaryCard
              title="AI runs"
              value={fmt(overview.aiRuns.total)}
              sub={overview.aiRuns.successRate !== null ? `${overview.aiRuns.successRate}% success` : undefined}
            />
            <SummaryCard
              title="Artifacts generated"
              value={fmt(overview.artifacts.targeted + overview.artifacts.generic)}
              sub={`${fmt(overview.artifacts.views)} views`}
            />
          </div>
        </section>
      )}

      {aiUsage && (
        <>
          {/* Runs by tool */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              AI usage by tool
            </h2>
            <Card>
              <CardContent className="pt-4 pb-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Tool</th>
                      <th className="pb-2 font-medium text-right">Runs</th>
                      <th className="pb-2 font-medium text-right">Avg duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiUsage.byTool.map((row) => (
                      <tr key={row.toolKind} className="border-b last:border-0">
                        <td className="py-2">{toolLabel(row.toolKind)}</td>
                        <td className="py-2 text-right tabular-nums">{fmt(row.count)}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {row.avgDurationMs ? `${(row.avgDurationMs / 1000).toFixed(1)}s` : "—"}
                        </td>
                      </tr>
                    ))}
                    {aiUsage.byTool.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-muted-foreground text-center">No runs in this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Scope + status + plan breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BreakdownCard
              title="By scope"
              rows={aiUsage.byScope.map((r) => ({
                label: r.scope === "GENERIC" ? "Generic (Tools page)" : "Targeted (Drawer)",
                count: r.count,
              }))}
            />
            <BreakdownCard
              title="By status"
              rows={aiUsage.byStatus.map((r) => ({
                label: STATUS_LABELS[r.status] ?? r.status,
                count: r.count,
              }))}
            />
            <BreakdownCard
              title="By plan"
              rows={aiUsage.byPlan.map((r) => ({
                label: r.plan ?? "Unknown",
                count: r.count,
              }))}
            />
          </div>

          {/* Top users */}
          {aiUsage.topUsers.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Top users by AI runs
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium">Plan</th>
                        <th className="pb-2 font-medium text-right">Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsage.topUsers.map((u) => (
                        <tr key={u.userId} className="border-b last:border-0">
                          <td className="py-2 text-muted-foreground truncate max-w-[220px]">
                            <a
                              href={`/admin/users/${u.userId}/analytics`}
                              className="hover:text-foreground hover:underline"
                            >
                              {u.email}
                            </a>
                          </td>
                          <td className="py-2 text-muted-foreground">{u.plan ?? "—"}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(u.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Recent failures */}
          {aiUsage.recentFailures.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent failures
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium text-right">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsage.recentFailures.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2">{toolLabel(r.toolKind)}</td>
                          <td className="py-2 text-muted-foreground">
                            {r.errorCategory ?? "UNKNOWN"}
                          </td>
                          <td className="py-2 text-muted-foreground truncate max-w-[180px]">
                            {r.user?.email ?? r.userId}
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
        </>
      )}

      {/* Recent activity feed */}
      {activity && activity.recentRuns.length > 0 && (
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
                    <th className="pb-2 font-medium">Scope</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.recentRuns.slice(0, 25).map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{toolLabel(r.toolKind)}</td>
                      <td className="py-2 text-muted-foreground capitalize">
                        {r.scope.toLowerCase()}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2 text-muted-foreground truncate max-w-[180px]">
                        <a
                          href={`/admin/users/${r.userId}/analytics`}
                          className="hover:text-foreground hover:underline"
                        >
                          {r.user?.email ?? r.userId}
                        </a>
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
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

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

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate">{r.label}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="tabular-nums font-medium">{fmt(r.count)}</span>
              {total > 0 && (
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round((r.count / total) * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No data.</div>
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
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}