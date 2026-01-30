"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/api/routes";
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
import { Eye, EyeOff } from "lucide-react";
import { evaluatePassword } from "@/lib/auth/password-policy";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

// wrap the RegisterPageInner component in a Suspense component so that the page is not rendered until the component is ready
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}



// RegisterPage: creates an account and logs the user in (receives JWT) via AuthContext.
export function RegisterPageInner() {
  const router = useRouter();
  const { register, isAuthenticated, isHydrated } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pwEval = evaluatePassword(password, email);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    pwEval.ok &&
    passwordsMatch &&
    !isSubmitting;
  
    const hasPassword = password.length > 0;

  const pwDotClass = !hasPassword
    ? "bg-muted-foreground/40"
    : pwEval.ok
    ? "bg-emerald-500"
    : "bg-red-500";

  const pwLabelClass = !hasPassword
    ? ""
    : pwEval.ok
    ? "text-emerald-600 dark:text-emerald-500"
    : "text-red-600 dark:text-red-500";



  // If already logged in, redirect.
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  // Handle Google OAuth sign in
  function handleGoogleSignIn() {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1";
    // console.log("baseUrl: ", baseUrl);
    // console.log("routes.auth.oauthGoogleStart(): ", routes.auth.oauthGoogleStart());
    // console.log(`${baseUrl}${routes.auth.oauthGoogleStart()}`);
    window.location.assign(`${baseUrl}${routes.auth.oauthGoogleStart()}`);
  }
  

  // Submitting Form (Attempt to register)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();   // stop page refresh
    setErrorMessage(null);

    // Make sure all fields are filled in
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    // Make sure the password meets the password policy
    if (!pwEval.ok) {
      setErrorMessage("Password does not meet requirements. Please review the rules below.");
      return;
    }
    
    // Make sure the passwords match
    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
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

          <div className="space-y-2 mb-0">
            <Label htmlFor="password">Password</Label>

            <div className="relative mb-0">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="pr-10"
                title="Passwords must be at least 8 characters and contain an uppercase letter, a lowercase letter, a number, and a symbol"
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
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              Strength:
              <span className={`inline-flex items-center gap-1 font-medium ${pwLabelClass}`}>
                <span className={`h-2 w-2 rounded-full ${pwDotClass}`} aria-hidden="true" />
                {pwEval.strengthLabel}
              </span>
            </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="text-xs text-muted-foreground">❌ Passwords do not match</p>
            ) : null}
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting} aria-disabled={!canSubmit} title={!canSubmit ? "Please fill in all fields and meet the password criteria" : undefined}>
            {isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t justify-center">
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium underline underline-offset-4 hover:text-foreground" href="/login">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
