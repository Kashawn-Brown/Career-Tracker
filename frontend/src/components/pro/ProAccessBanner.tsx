"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiProRequestSummary } from "@/types/api";
import { PENDING_REQUEST_COOLDOWN_DAYS, DENIED_REQUEST_COOLDOWN_DAYS } from "@/lib/constants";


type Props = {
  isPro: boolean;
  remainingAiCredits: number;
  canUseAi: boolean;
  aiProRequest: AiProRequestSummary | null;
  onRequestPro: () => void;
};

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Simple "clock" hook so time-based UI (like re-request eligibility) updates without refresh.
 * Ticks every 60s. We avoid calling Date.now() during render to prevent render-loop issues.
 */
function useNowMs(intervalMs = 60_000) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const update = () => setNowMs(Date.now());

    update(); // set an initial value after mount
    const id = window.setInterval(update, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return nowMs;
}


// Lets the user request Pro access if they have run out of free AI credits.
export function ProAccessBanner({
  isPro,
  remainingAiCredits,
  canUseAi,
  aiProRequest,
  onRequestPro,
}: Props) {
  
  const now = useNowMs();

  const requestInfo = useMemo(() => {
    if (!aiProRequest) return null;

    if (aiProRequest.status === "PENDING") {
      const eligibleAt = addDays(aiProRequest.requestedAt, PENDING_REQUEST_COOLDOWN_DAYS);
      const canRetry = now >= eligibleAt.getTime();
      return {
        title: "Request pending",
        body: `Sent ${fmtDate(new Date(aiProRequest.requestedAt))}. Please allow some time for a response.`,
        eligibleAt,
        canRetry,
      };
    }

    if (aiProRequest.status === "DENIED") {
      const baseIso = aiProRequest.decidedAt ?? aiProRequest.requestedAt;
      const eligibleAt = addDays(baseIso, DENIED_REQUEST_COOLDOWN_DAYS);
      const canRetry = now >= eligibleAt.getTime();
      return {
        title: "Request denied",
        body: `Denied ${aiProRequest.decidedAt ? fmtDate(new Date(aiProRequest.decidedAt)) : "—"}.`,
        eligibleAt,
        canRetry,
      };
    }

    if (aiProRequest.status === "EXPIRED") {
      return {
        title: "Request expired",
        body: "Your previous request may have gotten lost. You can send another request now.",
        eligibleAt: null,
        canRetry: true,
      };
    }

    return null;
  }, [aiProRequest, now]);

  if (isPro) return null;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">
            You have <span className="text-foreground">{remainingAiCredits ?? 0}</span> free AI credits remaining.
          </span>
        </div>
      </div>

      {!canUseAi ? (
        <div className="mt-3 space-y-2">
          {/* Avoid react/no-unescaped-entities */}
          <div className="text-sm font-medium">{"You've run out of your free AI credits."}</div>

          {requestInfo ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{requestInfo.title}</div>
              <div>{requestInfo.body}</div>

              {requestInfo.eligibleAt ? (
                <div>
                  You can re-request on{" "}
                  <span className="font-medium text-foreground">
                    {fmtDate(requestInfo.eligibleAt)}
                  </span>
                  .
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Request More Free Credits to keep using AI tools.
            </div>
          )}

          <div className="pt-1">
            <Button
              type="button"
              onClick={onRequestPro}
              disabled={!!requestInfo && requestInfo.canRetry === false}
            >
              {requestInfo?.title === "Request pending" && requestInfo.canRetry
                ? "Request again"
                : "Request Free Credits"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
