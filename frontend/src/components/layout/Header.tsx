"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Header: top navigation for the protected app area (includes logout).
export function Header() {
  const router = useRouter();
  const { user, logout, isHydrated  } = useAuth();

  function handleLogout() {
    // Clears auth state (token + user) and returns to login.
    logout();
    router.replace("/login");
  }

  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <div className="font-semibold">Career-Tracker</div>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/applications" className="hover:underline">
            Applications
          </Link>
          <Link href="/profile" className="hover:underline">
            Profile
          </Link>

          <span className="text-muted-foreground">{user?.name ? `Hey, ${user?.name}` : ""}</span>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </nav>
      </div>
    </header>
  );
}
