"use client";

// HomePage: public landing page for new visitors (and a quick "continue" path for authed users).

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const PREVIEW_ROWS = [
  { company: "Shopify", role: "Backend Developer", status: "Applied", applied: "Dec 12" },
  { company: "Deloitte", role: "Junior Developer", status: "Interview", applied: "Dec 18" },
  { company: "Robinhood", role: "Software Engineer", status: "Wishlist", applied: "Dec 23" },
] as const;

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {label}
    </span>
  );
}

export default function HomePage() {
  const { isAuthenticated, isHydrated } = useAuth();

  // We only trust auth state after hydration (localStorage + /users/me attempt).
  const showAuthedActions = isHydrated && isAuthenticated;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="text-base font-semibold tracking-tight">Career-Tracker</div>

          <div className="flex items-center gap-2">
            {showAuthedActions ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/profile">Profile</Link>
                </Button>
                <Button asChild>
                  <Link href="/applications">Applications</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Track your job search in one place.
            </h1>

            <p className="text-muted-foreground">
              Career-Tracker is a lightweight dashboard to manage applications, statuses, and your
              base resume metadata—so you stay organized while applying.
            </p>

            <div className="flex flex-wrap gap-2">
              {showAuthedActions ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/applications">Open dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/profile">View profile</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/register">Get started</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Log in</Link>
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              MVP note: auth uses an access token in localStorage (planned hardening post-deploy).
            </p>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Quick preview</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                      <th>Company</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">Applied</th>
                    </tr>
                  </thead>

                  <tbody className="[&>tr:not(:last-child)]:border-b">
                    {PREVIEW_ROWS.map((row) => (
                      <tr
                        key={`${row.company}-${row.role}`}
                        className="[&>td]:px-4 [&>td]:py-3"
                      >
                        <td className="font-medium">{row.company}</td>
                        <td className="text-muted-foreground">{row.role}</td>
                        <td>
                          <StatusPill label={row.status} />
                        </td>
                        <td className="text-right text-muted-foreground">{row.applied}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Applications, end-to-end</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Create, update, delete, and filter applications with consistent loading/empty/error
              states.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Stay consistent</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              A simple UI baseline (cards, alerts, layouts) that keeps the app clean and predictable.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Built for deployment</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Modular Fastify + Prisma backend, Dockerized Postgres locally, and k6 benchmarks ready
              for Cloud Run later.
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 rounded-lg border bg-muted/20 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">Ready to organize your search?</div>
              <div className="text-sm text-muted-foreground">
                Create an account and start tracking in under a minute.
              </div>
            </div>

            <Button asChild>
              <Link href={showAuthedActions ? "/applications" : "/register"}>
                {showAuthedActions ? "Go to applications" : "Create account"}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          Built with Next.js + Fastify + PostgreSQL.
        </div>
      </footer>
    </div>
  );
}
