"use client";

import { useEffect, useState } from "react";
import { useAuth }      from "@/hooks/useAuth";
import { analyticsApi } from "@/lib/api/analytics";
import { proApi }       from "@/lib/api/pro-api";
import { Button }       from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import type { UsageState } from "@/types/api";
import { getEffectivePlan, hasProPlan } from "@/lib/plans";

function fmt(n: number) { return n.toLocaleString(); }

function ProPill() {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
      PRO
    </span>
  );
}

export function ProfileProAccessCard() {
  const { user, refreshMe }                             = useAuth();
  const [usage,        setUsage]        = useState<UsageState | null>(null);
  const [requesting,   setRequesting]   = useState<"credits" | "pro" | null>(null);
  const [requestDone,  setRequestDone]  = useState<"credits" | "pro" | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi.getMyUsage().then(setUsage).catch(() => null);
  }, []);

  if (!user) return null;

  const effectivePlan = getEffectivePlan(user);
  const isPro         = hasProPlan(effectivePlan);

  const resetDate = usage
    ? new Date(usage.resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : null;

  async function handleRequest(type: "credits" | "pro") {
    setRequesting(type);
    setRequestError(null);
    try {
      await proApi.requestPro({
        note: type === "pro"
          ? "Requesting Pro access."
          : "Requesting additional monthly AI credits.",
      });
      setRequestDone(type);
      void refreshMe();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setRequesting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Credits {isPro ? <ProPill /> : null}
        </CardTitle>

        <CardDescription>
          {isPro
            ? `Pro plan · ${usage ? `${fmt(usage.usedCredits)} / ${fmt(usage.totalCredits)} credits used this month` : "Loading usage…"}`
            : usage
              ? `${fmt(usage.usedCredits)} / ${fmt(usage.totalCredits)} credits used this month`
              : "Loading usage…"}
          {resetDate && <span className="ml-1 text-muted-foreground">· resets {resetDate}</span>}
        </CardDescription>

        {!isPro && (
          <CardAction>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!requesting || requestDone === "pro"}
              onClick={() => handleRequest("pro")}
            >
              {requesting === "pro" ? "Sending…" : requestDone === "pro" ? "Request sent" : "Request Pro"}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {usage && (
        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.threshold === "BLOCKED"    ? "bg-red-500"    :
                  usage.threshold === "WARNING_90" ? "bg-orange-500" :
                  usage.threshold === "WARNING_75" ? "bg-amber-500"  :
                  "bg-primary"
                }`}
                style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmt(usage.remaining)} remaining</span>
              {usage.bonusCredits > 0 && (
                <span>Includes {fmt(usage.bonusCredits)} bonus credits</span>
              )}
            </div>
          </div>

          {/* Request more credits when running low or blocked */}
          {(usage.threshold === "WARNING_90" || usage.threshold === "BLOCKED") && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                {usage.isBlocked
                  ? `You've reached your monthly limit. Credits reset on ${resetDate}.`
                  : "You're running low on credits this month."}
              </p>
              {requestDone === "credits" ? (
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Request sent — an admin will review it shortly.
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!!requesting}
                  onClick={() => handleRequest("credits")}
                >
                  {requesting === "credits" ? "Sending…" : "Request more credits"}
                </Button>
              )}
              {!isPro && !requestDone && (
                <p className="text-xs text-muted-foreground">
                  Or{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => handleRequest("pro")}
                    disabled={!!requesting || requestDone === "pro"}
                  >
                    request Pro access
                  </button>
                  {" "}for a larger monthly allowance.
                </p>
              )}
            </div>
          )}

          {requestError && (
            <p className="text-sm text-destructive">{requestError}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}