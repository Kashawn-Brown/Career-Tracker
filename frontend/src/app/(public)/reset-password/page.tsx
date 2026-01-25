"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { OkResponse } from "@/types/api";
import { evaluatePassword } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { EyeOff, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  // Get the reset password token from the URL
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // Evaluate password strength
  const pwEval = evaluatePassword(password, "");
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // If the token is missing, show an error
  useEffect(() => {
    if (!token) setErrorMessage("Missing reset token. Please request a new reset link.");
  }, [token]);

  // If the user is already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Missing reset token. Please request a new reset link.");
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (!pwEval.ok) {
      setErrorMessage("Password does not meet requirements. Please review the rules.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      await apiFetch<OkResponse>(routes.auth.resetPassword(), {
        method: "POST",
        auth: false,
        body: { token, newPassword: password },
      });

      setDone(true);
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
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

        {done ? (
          <Alert>
            Password updated.{" "}
            <Link className="font-medium underline underline-offset-4" href="/login">
              Go to login
            </Link>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <div className="space-y-2 mb-0">
            <Label htmlFor="password">New password</Label>
            <div className="relative mb-0">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a new password"
                disabled={isSubmitting || done}
              />
              
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="text-right mr-1">
              <span className="text-xs text-muted-foreground">
                Strength: <span className="font-medium">{pwEval.strengthLabel}</span>
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={isSubmitting || done}
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="text-xs text-muted-foreground">❌ Passwords do not match</p>
            ) : null}
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting || done}>
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}