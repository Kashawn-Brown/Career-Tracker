"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isHydrated, isAuthenticated } = useAuth();
  const failed = isHydrated && !isAuthenticated;


  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) router.replace("/applications");
  }, [isHydrated, isAuthenticated, router]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Signing you in…</CardTitle>
        <CardDescription>Completing Google sign-in.</CardDescription>
      </CardHeader>

      <CardContent className="py-8 flex flex-col items-center gap-4">
        {!failed ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Please wait…</p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              We couldn’t complete Google sign-in. Please try again.
            </p>

            <Button asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
