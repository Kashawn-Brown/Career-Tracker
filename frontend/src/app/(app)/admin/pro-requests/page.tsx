"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProRequestsListResponse } from "@/types/api";

type ProRequestItem = AdminProRequestsListResponse["items"][number];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminProRequestsPage() {
  const [items, setItems] = useState<ProRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decision notes keyed by requestId
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});

  // Load the Pro requests.
  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await adminApi.listProRequests();
      setItems(res.items);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to load pro requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Sort the Pro requests by status and requestedAt.
  const sorted = useMemo(() => {
    // Keep it simple: PENDING first, then newest first.
    const rank: Record<string, number> = { PENDING: 0, EXPIRED: 1, DENIED: 2, APPROVED: 3 };
    return [...items].sort((a, b) => {
      const ra = rank[a.status] ?? 99;
      const rb = rank[b.status] ?? 99;
      if (ra !== rb) return ra - rb;

      const ta = new Date(a.requestedAt).getTime();
      const tb = new Date(b.requestedAt).getTime();
      return tb - ta;
    });
  }, [items]);

  // Approve a user's Pro request by requestId.
  async function approve(requestId: string) {
    setActing((m) => ({ ...m, [requestId]: true }));
    setErrorMsg(null);

    try {
      const noteRaw = decisionNotes[requestId] ?? "";
      const decisionNote = noteRaw.trim() ? noteRaw.trim() : undefined;

      await adminApi.approveProRequest(requestId, { decisionNote });
      setDecisionNotes((m) => ({ ...m, [requestId]: "" }));
      await load();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Approve failed");
    } finally {
      setActing((m) => ({ ...m, [requestId]: false }));
    }
  }

  // Deny a user's Pro request by requestId.
  async function deny(requestId: string) {
    setActing((m) => ({ ...m, [requestId]: true }));
    setErrorMsg(null);

    try {
      const noteRaw = decisionNotes[requestId] ?? "";
      const decisionNote = noteRaw.trim() ? noteRaw.trim() : undefined;

      await adminApi.denyProRequest(requestId, { decisionNote });
      setDecisionNotes((m) => ({ ...m, [requestId]: "" }));
      await load();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Deny failed");
    } finally {
      setActing((m) => ({ ...m, [requestId]: false }));
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Admin · Pro requests</h1>
          <p className="text-sm text-muted-foreground">
            Review Pro access requests and approve/deny.
          </p>
        </div>

        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">No Pro requests yet.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const isBusy = !!acting[r.id];

            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-3">
                    <div className="truncate">
                      {r.user.email}
                      {r.user.name ? <span className="text-muted-foreground"> · {r.user.name}</span> : null}
                    </div>
                    <div className="text-xs px-2 py-1 rounded border">
                      {r.status}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Requested: <span className="text-foreground">{formatDate(r.requestedAt)}</span>
                    {r.decidedAt ? (
                      <>
                        {" "}· Decided: <span className="text-foreground">{formatDate(r.decidedAt)}</span>
                      </>
                    ) : null}
                  </div>

                  {r.note ? (
                    <div className="text-sm">
                      <div className="font-medium">User note</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">{r.note}</div>
                    </div>
                  ) : null}

                  {r.decisionNote ? (
                    <div className="text-sm">
                      <div className="font-medium">Decision note (previous)</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">{r.decisionNote}</div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Decision note (optional)</div>
                    <Textarea
                      value={decisionNotes[r.id] ?? ""}
                      onChange={(e) => setDecisionNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                      placeholder="Optional note to include in the user email…"
                      disabled={isBusy || r.status !== "PENDING"}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => approve(r.id)}
                      disabled={isBusy || r.status !== "PENDING"}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deny(r.id)}
                      disabled={isBusy || r.status !== "PENDING"}
                    >
                      Deny
                    </Button>

                    {r.user.aiProEnabled ? (
                      <span className="text-sm text-muted-foreground ml-auto">
                        User currently has Pro ✅
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground ml-auto">
                        User Pro: off
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
