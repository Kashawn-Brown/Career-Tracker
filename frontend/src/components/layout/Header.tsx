"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { isAdminUser, getPlanBadgeLabel, hasProPlan, getEffectivePlan } from "@/lib/plans";

// Helper function to check if the current pathname is the same as the href
function isActivePath(pathname: string, href: string) {
  // Treat nested routes as active too (ex: /applications/123 stays active).
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Header: top navigation bar — adapts based on auth state.
// Logged in:  full app nav + user greeting + logout
// Logged out: public nav (About, Docs) + Login + Sign up
export function Header() {
  const pathname  = usePathname();
  const { user, logout, isAuthenticated, isHydrated } = useAuth();

  const isLoggedIn    = isHydrated && isAuthenticated;
  const displayName   = user?.name?.trim() || user?.email || "User";

  const authedNavItems = [
    { label: "Applications", href: "/applications" },
    { label: "Tools",        href: "/tools"         },
    { label: "Activity",     href: "/activity"      },
    ...(user && isAdminUser(user) ? [{ label: "Users",     href: "/admin/users"     }] : []),
    ...(user && isAdminUser(user) ? [{ label: "Analytics", href: "/admin/analytics" }] : []),
    { label: "About",        href: "/about"         },
    { label: "Docs",         href: "/docs"          },
  ];

  const publicNavItems = [
    { label: "About", href: "/about" },
    { label: "Docs",  href: "/docs"  },
  ];

  const navItems = isLoggedIn ? authedNavItems : publicNavItems;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">

        {/* Left: brand */}
        <div className="flex items-center justify-start">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Career-Tracker
          </Link>
        </div>

        {/* Center: nav links */}
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

        {/* Right: auth-dependent actions */}
        <div className="flex items-center justify-end gap-3 sm:gap-4">
          {isLoggedIn ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  <Link href="/profile">
                    Hey, <span className="underline underline-offset-1.5">{displayName}</span>
                  </Link>
                </span>

                {user && hasProPlan(getEffectivePlan(user)) && !isAdminUser(user) ? (
                  <span className="rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                    {getPlanBadgeLabel(user)}
                  </span>
                ) : null}

                {user && isAdminUser(user) ? (
                  <span className="rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                    ADMIN
                  </span>
                ) : null}
              </div>

              <Button type="button" variant="outline" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}