"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

  const navItems = [
    { label: "Applications", href: "/applications" },
    { label: "Profile", href: "/profile" },
    ...(user?.isAdmin ? [{ label: "Admin", href: "/admin/pro-requests" }] : []),
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: brand */}
        <div className="flex items-center justify-start">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Career-Tracker
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1 text-md justify-self-center">
          {navItems.map((item) => {
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

        {/* Right: Greeting + badges + Logout */}
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hey, {displayName}</span>

            {user?.aiProEnabled ? (
              <span className="rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                PRO
              </span>
            ) : null}

            {user?.isAdmin ? (
              <span className="rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                ADMIN
              </span>
            ) : null}
          </div>

          <Button type="button" variant="outline" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
