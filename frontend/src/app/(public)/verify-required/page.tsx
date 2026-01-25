"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { useAuth } from "@/hooks/useAuth";
import type { MeResponse, OkResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

// This page is displayed to users who are logged in but have not verified their email.

export default function VerifyRequiredPage() {
  const router = useRouter();
  const { user, isHydrated, isAuthenticated, setCurrentUser, logout } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guard: must be logged in to use this page.
  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // If already verified, they don't belong here.
    if (user?.emailVerifiedAt) {
      router.replace("/applications");
    }
  }, [isHydrated, isAuthenticated, user?.emailVerifiedAt, router]);

  // Resend the verification email
  async function handleResend() {
    setMessage(null);
    setErrorMessage(null);

    if (!user?.email) {
      setErrorMessage("Missing email. Please log in again.");
      return;
    }

    try {
      setIsResending(true);

      await apiFetch<OkResponse>(routes.auth.resendVerification(), {
        method: "POST",
        auth: false, // endpoint is public (no auth required)
        body: { email: user.email },
      });

      setMessage("Verification email sent. Check your inbox (and spam).");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  // Refresh the user's status to see if they are now verified
  async function handleRefreshStatus() {
    setMessage(null);
    setErrorMessage(null);

    try {
      setIsRefreshing(true);

      const me = await apiFetch<MeResponse>(routes.users.me(), { method: "GET" });
      setCurrentUser(me.user);

      if (me.user.emailVerifiedAt) {
        router.replace("/applications");
        return;
      }

      setMessage("Still not verified yet. Once you verify, click refresh again.");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Could not refresh status. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!isHydrated) return <div className="text-sm">Loading...</div>;
  if (!isAuthenticated) return null; // redirect in-flight

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          You must verify your email before you can access the app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {user?.email ? (
          <div className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </div>
        ) : null}

        {message ? <Alert>{message}</Alert> : null}
        {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}

        <div className="space-y-2">
          <Button className="w-full" onClick={handleResend} disabled={isResending}>
            {isResending ? "Sending..." : "Resend verification email"}
          </Button>

          <Button className="w-full" variant="outline" onClick={handleRefreshStatus} disabled={isRefreshing}>
            {isRefreshing ? "Checking..." : "I verified — continue"}
          </Button>

          <Button
            className="w-full"
            variant="ghost"
            onClick={() => logout()}
            title="Logs you out on this device"
          >
            Log out
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Tip: If you don’t see the email, check spam/junk, then resend.
        </div>
      </CardContent>

      <CardFooter className="border-t justify-center">
        <div className="text-xs text-muted-foreground">
          Once verified, click <span className="font-medium text-foreground">I verified — continue</span>.
        </div>
      </CardFooter>
    </Card>
  );
}
