"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { OkResponse } from "@/types/api";
// import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  // Get the verification token from the URL
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [status, setStatus] = useState<"idle" | "verifying" | "ok" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verify the email token
  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Missing verification token.");
        return;
      }

      try {
        setStatus("verifying");
        setErrorMessage(null);

        await apiFetch<OkResponse>(routes.auth.verifyEmail(), {
          method: "POST",
          auth: false,
          body: { token },
        });

        setStatus("ok");
        router.replace("/login");
      } catch (err) {
        setStatus("error");
        if (err instanceof ApiError) setErrorMessage(err.message);
        else setErrorMessage("Verification failed. Please request a new link.");
      }
    })();
  }, [token, router]);

  // If the user is already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Verify email</CardTitle>
        <CardDescription>Confirming your email address…</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === "verifying" ? (
          <Alert>Verifying…</Alert>
        ) : null}

        {status === "ok" ? (
          <Alert>Your email is verified. You can log in now.</Alert>
        ) : null}

        {status === "error" ? (
          <Alert variant="destructive">{errorMessage ?? "Verification failed."}</Alert>
        ) : null}

        {/* <div className="flex gap-2">
          <Button asChild className="w-full">
            <Link href="/login">Go to login</Link>
          </Button>
        </div> */}
      </CardContent>

      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          Token expired?{" "}
          <Link className="font-medium underline underline-offset-4 hover:text-foreground" href="/login">
            Request a new link
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
