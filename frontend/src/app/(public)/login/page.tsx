"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

// LoginPage: collects credentials and exchanges them for a JWT via AuthContext.
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { login, isAuthenticated, isHydrated } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If the user is already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  // Handle Google OAuth errors
  useEffect(() => {
    if (errorMessage) return;
  
    const oauth = searchParams.get("oauth");
    if (oauth === "failed") setErrorMessage("Google sign-in failed. Please try again.");
    if (oauth === "cancelled") setErrorMessage("Google sign-in was cancelled.");
  }, [searchParams, errorMessage]);
  
  // Handle Google OAuth sign in
  function handleGoogleSignIn() {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1";
    window.location.assign(`${baseUrl}${routes.auth.oauthGoogleStart()}`);
  }
  

  // Submitting Form (Attempt to log in)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();   // stop browser from page refresh on form submit
    setErrorMessage(null);

    // Minimal MVP validation: avoid empty submissions.
    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password }); // AuthContext stores token + user
      router.replace("/applications");
    
    } catch (err) {
      // Consistent error message handling.
      if (err instanceof ApiError) setErrorMessage(err.message);
      
      else setErrorMessage("Login failed. Please try again.");
      
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in to continue.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="relative">
            <Alert variant="destructive" className="pr-10">
              {errorMessage}
            </Alert>

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

        {/* Google OAuth sign in */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        </div>


        {/* Email/password sign in */}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            
            {/* Forgot password link */}
            <div className="text-right">
              <Link className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground" href="/forgot-password">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          No account?{" "}
          <Link className="font-medium underline underline-offset-4 hover:text-foreground" href="/register">
            Create one
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
