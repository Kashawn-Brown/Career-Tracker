"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
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

// LoginPage: collects credentials and exchanges them for a JWT via AuthContext.
export default function LoginPage() {
  const router = useRouter();
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
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
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
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          No account?{" "}
          <Link className="font-medium underline underline-offset-4" href="/register">
            Create one
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
