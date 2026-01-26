"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiProRequestSummary } from "@/types/api";

// Constants for the Pro access banner.
const AI_FREE_QUOTA = 5;
const PENDING_REREQUEST_COOLDOWN_DAYS = 7;
const DENIED_REREQUEST_COOLDOWN_DAYS = 14;

type Props = {
  aiProEnabled: boolean;
  aiFreeUsesUsed: number;
  aiProRequest: AiProRequestSummary | null;
  onRequestPro: () => void;
};

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ProAccessBanner({ aiProEnabled, aiFreeUsesUsed, aiProRequest, onRequestPro }: Props) {

  const remaining = Math.max(0, AI_FREE_QUOTA - aiFreeUsesUsed);
  const isLocked = !aiProEnabled && remaining === 0;

  // Determine the request info based on the Pro request status.
  const requestInfo = useMemo(() => {
    // If there is no Pro request, return null.
    if (!aiProRequest) return null;

    // If the Pro request is pending, build this response and return the request info.
    if (aiProRequest.status === "PENDING") {
      const eligibleAt = addDays(aiProRequest.requestedAt, PENDING_REREQUEST_COOLDOWN_DAYS);
      const canRetry = Date.now() >= eligibleAt.getTime();
      return {
        title: "Request pending",
        body: `Sent ${fmtDate(new Date(aiProRequest.requestedAt))}. Please allow some time for a response.`,
        eligibleAt,
        canRetry,
      };
    }

    // If the Pro request is denied, build this response and return the request info.
    if (aiProRequest.status === "DENIED") {
      const baseIso = aiProRequest.decidedAt ?? aiProRequest.requestedAt;
      const eligibleAt = addDays(baseIso, DENIED_REREQUEST_COOLDOWN_DAYS);
      const canRetry = Date.now() >= eligibleAt.getTime();
      return {
        title: "Request denied",
        body: `Denied ${aiProRequest.decidedAt ? fmtDate(new Date(aiProRequest.decidedAt)) : "—"}.`,
        eligibleAt,
        canRetry,
      };
    }

    // If the Pro request is expired, build this response and return the request info.
    if (aiProRequest.status === "EXPIRED") {
      return {
        title: "Request expired",
        body: "Your previous request may have gotten lost. You can send another request now.",
        eligibleAt: null,
        canRetry: true,
      };
    }

    // If the Pro request is approved, return null.
    return null;
  }, [aiProRequest]);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {aiProEnabled ? (
            <span className="font-medium">Pro enabled</span>
          ) : (
            <span className="font-medium">Free AI credits: {remaining}/{AI_FREE_QUOTA} remaining</span>
          )}
        </div>

        {/* Show the PRO badge if the user is Pro. */}
        {aiProEnabled ? (
          <span className="text-xs px-2 py-0.5 rounded-full border">PRO</span>
        ) : null}
      </div>

      {/* Show the Pro access banner if the user is not Pro and has run out of free AI credits. */}
      {isLocked ? (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-medium">You've run out of your free AI credits.</div>

          {/* Show the request info if there is a Pro request. */}
          {requestInfo ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">{requestInfo.title}</div>
              <div>{requestInfo.body}</div>

              {requestInfo.eligibleAt ? (
                <div>
                  You can re-request on <span className="font-medium text-foreground">{fmtDate(requestInfo.eligibleAt)}</span>.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Request Pro access to keep using AI tools.
            </div>
          )}

          <div className="pt-1">
            <Button
              type="button"
              onClick={onRequestPro}
              disabled={!!requestInfo && requestInfo.canRetry === false}
            >
              {requestInfo?.title === "Request pending" && requestInfo.canRetry ? "Request again" : "Request Pro access"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
