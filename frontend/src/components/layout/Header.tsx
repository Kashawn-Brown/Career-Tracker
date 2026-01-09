"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// Navigation items for the header
const NAV_ITEMS = [
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
] as const;

// Helper function to check if the current pathname is the same as the href
function isActivePath(pathname: string, href: string) {
  // Treat nested routes as active too (ex: /applications/123 stays active).
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Header: top navigation for the protected app area (includes logout).
export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "User";

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: brand */}
        <Link href="/" className="text-base font-semibold tracking-tight">
          Career-Tracker
        </Link>

        {/* Right: nav + greeting + logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-accent text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Hide on very small screens to avoid cramped header */}
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Hey, {displayName}
          </span>

          <Button type="button" variant="outline" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
