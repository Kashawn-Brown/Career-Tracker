"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestProDialog } from "@/components/pro/RequestProDialog";
import type { AiProRequestSummary } from "@/types/api";

const AI_FREE_QUOTA = 5;
const PENDING_REREQUEST_COOLDOWN_DAYS = 7;
const DENIED_REREQUEST_COOLDOWN_DAYS = 14;

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ProPill() {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
      PRO
    </span>
  );
}

type RequestInfo = {
  title: string;
  body: string;
  eligibleAt: Date | null;
  canRetry: boolean;
};

function buildRequestInfo(aiProRequest: AiProRequestSummary | null): RequestInfo | null {
  if (!aiProRequest) return null;

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

  if (aiProRequest.status === "EXPIRED") {
    return {
      title: "Request expired",
      body: "Your previous request may have gotten lost. You can send another request now.",
      eligibleAt: null,
      canRetry: true,
    };
  }

  // APPROVED / CREDITS_GRANTED -> user state should reflect it; no extra messaging needed here
  return null;
}

export function ProfileProAccessCard() {
  const { user, aiProRequest, refreshMe } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const aiProEnabled = Boolean(user?.aiProEnabled);
  const used = user?.aiFreeUsesUsed ?? 0;
  const remaining = Math.max(0, AI_FREE_QUOTA - used);

  const requestInfo = useMemo(() => buildRequestInfo(aiProRequest), [aiProRequest]);

  const disableRequest = Boolean(requestInfo && requestInfo.canRetry === false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Access {aiProEnabled ? <ProPill /> : null}
          </CardTitle>

          <CardDescription>
            {aiProEnabled
              ? "Your account has Pro access (unlimited AI tools)."
              : `Free AI credits: ${remaining}/${AI_FREE_QUOTA} remaining`}
          </CardDescription>

          <CardAction>
            {!aiProEnabled ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                disabled={disableRequest}
              >
                {requestInfo?.title === "Request pending" && requestInfo.canRetry
                  ? "Request again"
                  : "Request Pro / more credits"}
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>

        {!aiProEnabled ? (
          <CardContent className="">
            {requestInfo ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">{requestInfo.title}</div>
                <div>{requestInfo.body}</div>

                {requestInfo.eligibleAt ? (
                  <div>
                    You can re-request on{" "}
                    <span className="font-medium text-foreground">{fmtDate(requestInfo.eligibleAt)}</span>.
                  </div>
                ) : null}
              </div>
            ) : (
              null
            )}
          </CardContent>
        ) : null}
      </Card>

      <RequestProDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onRequested={() => refreshMe()}
      />
    </>
  );
}
