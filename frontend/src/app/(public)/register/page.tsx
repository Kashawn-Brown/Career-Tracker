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
import { Alert } from "@/components/ui/alert";

// RegisterPage: creates an account and logs the user in (receives JWT) via AuthContext.
export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isHydrated } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  // Submitting Form (Attempt to register)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();   // stop page refresh
    setErrorMessage(null);

    // Minimal MVP validation.
    if (!name || !email || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      await register({ name, email, password }); // AuthContext stores token + user
      router.replace("/applications");

    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      
      else setErrorMessage("Registration failed. Please try again.");

    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Create account</CardTitle>
        <CardDescription>Get started in less than a minute.</CardDescription>
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User Name"
            />
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium underline underline-offset-4" href="/login">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
