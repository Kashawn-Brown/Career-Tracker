"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUser } from "@/lib/plans";

/**
 * Blocks access to admin-only pages.
 * Assumes the user is already authenticated (RequireAuth runs at (app)/layout),
 * but still guards defensively.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isHydrated, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // If auth is hydrated but user isn't ready yet, wait
    if (!user) return;

    if (!isAdminUser(user)) {
      router.replace("/applications");
    }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;
  if (!isAdminUser(user)) return null;

  return <>{children}</>;
}
