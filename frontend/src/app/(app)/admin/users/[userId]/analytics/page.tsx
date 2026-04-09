"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { analyticsApi } from "@/lib/api/analytics";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { AdminUserAnalyticsResponse, DateWindow } from "@/types/api";

export default function AdminUserAnalyticsPage() {
  return (
    <RequireAdmin>
      <AdminUserAnalyticsContent />
    </RequireAdmin>
  );
}

const TOOL_LABELS: Record<string, string> = {
  JD_EXTRACTION:     "JD Extraction",
  FIT:               "Compatibility Check",
  RESUME_HELP:       "Resume Advice (Generic)",
  COVER_LETTER_HELP: "Cover Letter (Generic)",
  RESUME_ADVICE:     "Resume Advice (Targeted)",
  COVER_LETTER:      "Cover Letter (Targeted)",
  INTERVIEW_PREP:    "Interview Prep",
};

function toolLabel(kind: string) { return TOOL_LABELS[kind] ?? kind; }
function fmt(n: number) { return n.toLocaleString(); }
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AdminUserAnalyticsContent() {
  const { userId } = useParams<{ userId: string }>();
  const [window, setWindow]   = useState<DateWindow>("30d");
  const [data, setData]       = useState<AdminUserAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.getAdminUserAnalytics(userId, window));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, window]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <a href="/admin/analytics" className="hover:underline">Analytics</a>
            {" / User"}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data?.user.email ?? "User"}
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Plan: <span className="font-medium">{data.user.plan}</span>
              {" · "}
              Joined {new Date(data.user.createdAt).toLocaleDateString()}
            </p>
          )}
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
      {isLoading && !data && <div className="text-sm text-muted-foreground">Loading...</div>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard title="Applications"        value={fmt(data.applicationCount)} />
            <SummaryCard title="AI runs"             value={fmt(data.aiRuns.byStatus.reduce((s, r) => s + r.count, 0))} />
            <SummaryCard title="Artifacts generated" value={fmt(data.artifacts.targeted + data.artifacts.generic)} />
            <SummaryCard title="Artifact views"      value={fmt(data.artifacts.interactions)} />
          </div>

          {/* AI runs by tool */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              AI runs by tool
            </h2>
            <Card>
              <CardContent className="pt-4 pb-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Tool</th>
                      <th className="pb-2 font-medium text-right">Succeeded</th>
                      <th className="pb-2 font-medium text-right">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      data.aiRuns.byTool.reduce<Record<string, { succeeded: number; failed: number }>>((acc, r) => {
                        if (!acc[r.toolKind]) acc[r.toolKind] = { succeeded: 0, failed: 0 };
                        if (r.status === "SUCCEEDED") acc[r.toolKind].succeeded += r.count;
                        if (r.status === "FAILED")    acc[r.toolKind].failed    += r.count;
                        return acc;
                      }, {})
                    ).map(([kind, counts]) => (
                      <tr key={kind} className="border-b last:border-0">
                        <td className="py-2">{toolLabel(kind)}</td>
                        <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{counts.succeeded}</td>
                        <td className="py-2 text-right tabular-nums text-red-500">{counts.failed || "—"}</td>
                      </tr>
                    ))}
                    {data.aiRuns.byTool.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-muted-foreground text-center">No runs in this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Recent runs */}
          {data.aiRuns.recent.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent runs
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium">Scope</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">Duration</th>
                        <th className="pb-2 font-medium text-right">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.aiRuns.recent.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2">{toolLabel(r.toolKind)}</td>
                          <td className="py-2 text-muted-foreground capitalize">{r.scope.toLowerCase()}</td>
                          <td className="py-2">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-2 text-right text-muted-foreground tabular-nums">
                            {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}
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
                Recent activity
              </h2>
              <Card>
                <CardContent className="pt-4 pb-2">
                  <div className="space-y-2">
                    {data.recentEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{formatEventType(e.eventType)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
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
  const labels: Record<string, string> = { SUCCEEDED: "Succeeded", FAILED: "Failed", STARTED: "In progress" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatEventType(type: string) {
  return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}