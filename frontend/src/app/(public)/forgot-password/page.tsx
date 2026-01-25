"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { OkResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // If the user is already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      return;
    }

    try {
      setIsSubmitting(true);

      await apiFetch<OkResponse>(routes.auth.forgotPassword(), {
        method: "POST",
        auth: false,
        body: { email },
      });

      // Always show success
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Request failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>{"Enter your account email. We'll send you a link to reset your password."}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="relative">
            <Alert variant="destructive" className="pr-10">{errorMessage}</Alert>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss message"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        ) : null}

        {sent ? (
          <Alert>
            An email has been sent to <span className="font-medium">{email}</span> with a link to reset your password.
            <br />
            <br />
            <span className="text-muted-foreground text-xs">If you have an account using that email address and didn't receive an email, check your spam folder or try again.</span>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting || sent}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting || sent}>
            {isSubmitting ? "Sending..." : sent ? "Email sent" : "Send reset link"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          <Link className="font-medium underline underline-offset-4" href="/login">
            Back to login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
