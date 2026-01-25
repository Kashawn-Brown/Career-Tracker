"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Prevents rendering protected routes unless the user is authenticated AND verified.
 *
 * Policy:
 * - Unauthenticated -> /login
 * - Authenticated but unverified -> /verify-required
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isHydrated, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until we've completed the initial session bootstrap check (csrf -> refresh -> /users/me)
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Safety: if token exists but user isn't loaded yet, don't redirect prematurely.
    if (!user) return;

    if (!user.emailVerifiedAt) {
      router.replace("/verify-required");
    }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated) return <div className="text-sm">Loading...</div>;
  if (!isAuthenticated) return null; // redirect is in-flight
  if (!user) return <div className="text-sm">Loading...</div>;
  if (!user.emailVerifiedAt) return null; // redirect is in-flight

  return <>{children}</>;
}
