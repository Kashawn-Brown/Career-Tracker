"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Header: top navigation for authenticated pages.
export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const displayName = user?.name?.trim() || user?.email || "User";

  // Base styles for navigation links so they feel like intentional nav items,
  // not plain text. Small pill shape + hover background.
  const navLinkBase =
    "inline-flex items-center h-9 rounded-full px-4 text-sm font-medium transition-colors";

  /**
   * navLinkClass: helper function to add active class to the current page
   * 
   * It helps highlight the link for the current page so users know where they are.
   * 
   * Returns one class string for active links (darker text), another for inactive (muted text).
   * 
   * @param href - the href of the link
   * @returns the base class and the active class if the current pathname is the same as the href
   */
  function navLinkClass(href: string) {
    // Checks which page you're currently viewing
    const isActive = pathname === href;

    // return the base class and the active class IF the current pathname is the same as the href (this is the page we are currently on)
    return [
      navLinkBase,
      isActive
        ? "bg-background/10 text-foreground" // active: subtle pill + stronger text
        : "text-muted-foreground hover:bg-background/10 hover:text-foreground", // inactive: muted until hover
    ].join(" ");
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-50 shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
        {/* Left: logo + brand */}
        <div className="flex flex-1 items-center gap-3">
          <Link href="/applications" className="flex items-center gap-2">
            {/* Replace src with your actual logo when ready */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/90 shadow-sm">
              <Image
                src="/globe.svg"
                alt="Career-Tracker logo"
                width={20}
                height={20}
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Career<span className="text-sky-400">Tracker</span>
            </span>
          </Link>
        </div>

        {/* Center: primary navigation */}
        <nav className="flex items-center justify-center gap-4">
            {/* Applications link */}
            <Link href="/applications" className={navLinkClass("/applications")}>
              Applications
            </Link>

            {/* Profile link */}
            <Link href="/profile" className={navLinkClass("/profile")}>
              Profile
            </Link>
          </nav>

        {/* Right: user greeting + logout action */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">
            Hey, {displayName}
          </span>

          <Button
            type="button"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={logout}
          >
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
