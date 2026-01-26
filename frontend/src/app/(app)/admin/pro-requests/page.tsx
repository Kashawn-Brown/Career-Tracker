"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AdminProRequestsListResponse } from "@/types/api";

type ProRequestItem = AdminProRequestsListResponse["items"][number];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}


export default function AdminProRequestsPage() {
  const [items, setItems] = useState<ProRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decision notes keyed by requestId
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const [showHistory, setShowHistory] = useState(false);


  // Load the Pro requests.
  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await adminApi.listProRequests();
      setItems(res.items);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to load pro requests"));
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

  // Show all requests if showHistory is true, otherwise show only pending requests.
  const visibleRequests = showHistory
  ? sorted
  : sorted.filter((r) => r.status === "PENDING" || r.status === "EXPIRED");


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
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Approve failed"));
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
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Deny failed"));
    } finally {
      setActing((m) => ({ ...m, [requestId]: false }));
    }
  }

  // Grant more free AI credits to a user by requestId.
  async function grantCredits(requestId: string) {
    setActing((m) => ({ ...m, [requestId]: true }));
    setErrorMsg(null);

    try {
      await adminApi.grantCredits(requestId);
      await load();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Grant credits failed"));
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Hide history" : "View history"}
          </Button>

          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : visibleRequests.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {showHistory ? "No pro requests found." : "No pending pro requests."}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((r) => {
            const isBusy = !!acting[r.id];
            return (
              <Card className="p-3" key={r.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {r.user.email}
                      <span className="text-muted-foreground"> · {r.user.name}</span>
                    </div>

                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Requested: {formatDate(r.requestedAt)}
                      {r.decidedAt ? ` · Decided: ${formatDate(r.decidedAt)}` : ""}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                      {r.status}
                    </span>
                  </div>
                </div>

                {r.note ? (
                  <div className="mt-2 max-w-[680px] whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {r.note}
                  </div>
                ) : null}

                {r.status === "PENDING" ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => approve(r.id)}>
                      {isBusy ? "Approving..." : "Approve"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deny(r.id)}>
                      {isBusy ? "Denying..." : "Deny"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => grantCredits(r.id)}>
                      {isBusy ? "Granting credits..." : "Grant credits"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
