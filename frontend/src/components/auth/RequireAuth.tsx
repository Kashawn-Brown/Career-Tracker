"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/** 
 * Prevents rendering protected routes unless the user is authenticated.
 * 
 * Use it to wrap around protected UI so unauthenticated users get redirected to /login
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  
  // Destructuring to read the auth status from context. 
  const { isHydrated, isAuthenticated } = useAuth();
  const router = useRouter();

  // Gate logic
  useEffect(() => {
    
    // Wait until we’ve checked localStorage (and /me if token existed).
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated) return <div className="text-sm">Loading...</div>;
  if (!isAuthenticated) return null; // redirect is in-flight

  return <>{children}</>;
}
