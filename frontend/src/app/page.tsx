"use client";

// HomePage: public landing page for new visitors (and a quick "continue" path for authed users).

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import type { ApplicationStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/applications/presentation";
import { PILL_BASE_CLASS, getStatusPillTokens } from "@/lib/applications/pills";

type PreviewRow = {
  company: string;
  role: string;
  location: string
  type: string; 
  workMode: string;
  status: ApplicationStatus;
  salary: string;
  resume: string;
  coverLetter: string;
  match: string;
  applied: string;

  // Demo drawer content (static + lightweight on purpose)
  jobLink: string;
  highlights: string[];
  jdExtractPreview: string[];
  fitSummary: {
    score: string;
    strengths: string[];
    gaps: string[];
  };
};

const PREVIEW_ROWS: PreviewRow[] = [
  {
    company: "Shopify",
    role: "Backend Developer",
    location: "Vancouver, BC",
    type: "Internship",
    workMode: "Remote",
    status: "APPLIED",
    salary: "$110k–$140k",
    resume: "Base Resume",
    coverLetter: "Planned",
    match: "73%",
    applied: "Dec 12",

    jobLink: "https://example.com/jobs/backend-developer",
    highlights: ["Fast-moving product team", "API + services focus", "Strong testing culture"],
    jdExtractPreview: [
      "Build and maintain backend services and APIs",
      "Work with PostgreSQL and caching (Redis)",
      "Write tests and improve reliability/observability",
      "Collaborate with product + engineering to ship iteratively",
    ],
    fitSummary: {
      score: "73%",
      strengths: ["Backend fundamentals", "SQL + API design", "Testing-first approach"],
      gaps: ["More production scale experience", "Deeper AWS service exposure (if required)"],
    },
  },
  {
    company: "Deloitte",
    role: "Junior Developer",
    location: "Ottawa, ON",
    type: "Contract",
    workMode: "Hybrid",
    status: "INTERVIEW",
    salary: "—",
    resume: "Tailored v2",
    coverLetter: "Drafted",
    match: "78%",
    applied: "Dec 18",

    jobLink: "https://example.com/jobs/junior-developer",
    highlights: ["Client-facing delivery", "Agile team workflows", "Full-stack exposure"],
    jdExtractPreview: [
      "Ship features in a modern web stack (APIs + UI)",
      "Collaborate in Agile ceremonies and code reviews",
      "Debug issues and write clean, maintainable code",
      "Work with cloud services and CI/CD pipelines",
    ],
    fitSummary: {
      score: "78%",
      strengths: ["Full-stack capability", "Good communication + collaboration", "Delivery mindset"],
      gaps: ["Domain-specific tooling (varies by team)", "More experience with large legacy systems"],
    },
  },
  {
    company: "Robinhood",
    role: "Software Engineer",
    location: "Toronto, ON",
    type: "Full-Time",
    workMode: "On-site",
    status: "WISHLIST",
    salary: "$120k–$160k",
    resume: "Base Resume",
    coverLetter: "—",
    match: "82%",
    applied: "—",

    jobLink: "https://example.com/jobs/software-engineer",
    highlights: ["High quality bar", "Performance + reliability", "Strong engineering practices"],
    jdExtractPreview: [
      "Design and ship scalable backend systems",
      "Own services end-to-end with monitoring and testing",
      "Optimize data access patterns and performance",
      "Collaborate across teams to deliver customer value",
    ],
    fitSummary: {
      score: "82%",
      strengths: ["Systems thinking", "API + data modeling", "Security-minded development"],
      gaps: ["More time at high scale", "Team-specific stack depth (depends on org)"],
    },
  },
];

function StatusPill({ status }: { status: ApplicationStatus }) {
  const { wrap, dot } = getStatusPillTokens(status);
  return (
    <span className={cn(PILL_BASE_CLASS, wrap)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {statusLabel(status)}
    </span>
  );
}

function HowItWorksStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
            {step}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 text-sm text-muted-foreground">{body}</CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { isAuthenticated, isHydrated } = useAuth();

  // We only trust auth state after completing the initial session bootstrap check (csrf -> refresh)
  const showAuthedActions = isHydrated && isAuthenticated;

  // Demo drawer (public preview)
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selected = useMemo(() => PREVIEW_ROWS[selectedIndex], [selectedIndex]);

  function openDemo(index: number) {
    setSelectedIndex(index);
    setIsDemoOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="space-y-4 text-center mx-auto w-full max-w-screen-lg px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Keep track of your job search in one place.
          </h1>

          <p className="text-muted-foreground">
            Manage applications, statuses, connections, and documents all in one dashboard.
            Use AI tools to extract structured job details from a posting, check your compatibility with a role, get targeted resume advice, generate cover letters, and prepare for interviews — all from a single drawer.
            Includes{" "}
            <span className="font-medium text-foreground">5 free AI credits</span> on sign up, with Pro access available to unlock more.
          </p>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-3 py-1">Application Tracking</span>
            <span className="rounded-full border px-3 py-1">Detailed Drawer View</span>
            <span className="rounded-full border px-3 py-1">AI JD Extraction</span>
            <span className="rounded-full border px-3 py-1">Compatibility Check</span>
            <span className="rounded-full border px-3 py-1">Resume Advice</span>
            <span className="rounded-full border px-3 py-1">Cover Letter Generation</span>
            <span className="rounded-full border px-3 py-1">Interview Prep</span>
            <span className="rounded-full border px-3 py-1">Document Storage</span>
            <span className="rounded-full border px-3 py-1">Connection Management</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
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
              <div className="flex flex-col items-center gap-2">
                <Button asChild size="lg">
                  <Link href="/register">Get started</Link>
                </Button>

                <div className="text-sm text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Log in
                  </Link>
                  {" · "}
                  <Link href="/login" className="underline underline-offset-4">
                    Sign in with Google
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-10 mx-auto w-full max-w-screen-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <div className="text-lg font-semibold">How it works</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HowItWorksStep
              step="1"
              title="Create an account"
              body="Sign up with email or continue with Google OAuth. Verify your email to unlock the dashboard and AI tools."
            />
            <HowItWorksStep
              step="2"
              title="Track applications"
              body="Add application info. Standard view via table + Detailed view/edit via side drawer."
            />
            <HowItWorksStep
              step="3"
              title="Use AI tools"
              body="Run AI tools directly from the application drawer. Generic versions of each tool are also available on the Tools page without needing a specific application."
            />
            <HowItWorksStep
              step="4"
              title="Attach context"
              body="Upload application-specific documents and track connections so your applications stay complete and easy to follow up on."
            />
          </div>
        </section>

        {/* PREVIEW + DEMO DRAWER */}
        <section className="mt-10">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Interactive preview</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                      <th>Company</th>
                      <th>Position</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>Work arrangement</th>
                      <th>Status</th>
                      <th>Salary</th>
                      <th>Match</th>
                      <th className="text-right">Applied</th>
                      <th className="text-right">Preview</th>
                    </tr>
                  </thead>

                  <tbody className="[&>tr:not(:last-child)]:border-b">
                    {PREVIEW_ROWS.map((row, idx) => (
                      <tr key={`${row.company}-${row.role}`} className="[&>td]:px-4 [&>td]:py-3">
                        <td className="font-medium">{row.company}</td>
                        <td>{row.role}</td>
                        <td>{row.location}</td>
                        <td>{row.type}</td>
                        <td className="text-muted-foreground">{row.workMode}</td>
                        <td>
                          <StatusPill status={row.status} />
                        </td>
                        <td className="text-muted-foreground">{row.salary}</td>
                        <td className="text-muted-foreground">{row.match}</td>
                        <td className="text-right text-muted-foreground">{row.applied}</td>
                        <td className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => openDemo(idx)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Sheet open={isDemoOpen} onOpenChange={setIsDemoOpen}>
            <SheetContent side="right" className="space-y-6 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Demo · Application details</SheetTitle>
                <SheetDescription>
                  This is a lightweight preview of the real drawer experience (demo data).
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="rounded-md border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Company</div>
                      <div className="text-base font-semibold">{selected.company}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="mt-1">
                        <StatusPill status={selected.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Position</div>
                      <div className="text-right">{selected.role}</div>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Location</div>
                      <div className="text-right text-muted-foreground">{selected.location}</div>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Job type</div>
                      <div className="text-right text-muted-foreground">{selected.type}</div>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Work arrangement</div>
                      <div className="text-right">{selected.workMode}</div>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Salary</div>
                      <div className="text-right">{selected.salary}</div>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Job link</div>
                      <div className="text-right text-muted-foreground">{selected.jobLink}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Highlights</div>
                  <div className="rounded-md border bg-muted/10 p-4 text-sm">
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {selected.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-base">AI · Job description extract (demo)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-sm text-muted-foreground">
                    <ul className="list-disc space-y-1 pl-5">
                      {selected.jdExtractPreview.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-base">AI · Compatibility check (demo)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-sm">
                    <div className="flex items-baseline justify-between">
                      <div className="text-muted-foreground">Compatibility score</div>
                      <div className="text-lg font-semibold">{selected.fitSummary.score}</div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border bg-muted/10 p-3">
                        <div className="text-sm font-medium">Strengths</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {selected.fitSummary.strengths.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-md border bg-muted/10 p-3">
                        <div className="text-sm font-medium">Potential gaps</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {selected.fitSummary.gaps.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                      <div className="font-medium text-foreground text-sm">More AI tools available in the full app:</div>
                      <div>· Resume Advice — targeted suggestions + keyword coverage</div>
                      <div>· Cover Letter — tailored draft based on the JD and your resume</div>
                      <div>· Interview Prep — question bank, focus topics, and prep areas</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-md border bg-muted/10 p-4 text-sm text-muted-foreground">
                  Real dashboard includes: editing fields, tags/notes, documents, connections, and running AI on your own
                  job descriptions.
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {showAuthedActions ? (
                    <>
                      <Button asChild className="sm:w-auto">
                        <Link href="/applications">Open dashboard</Link>
                      </Button>
                      <Button asChild variant="outline" className="sm:w-auto">
                        <Link href="/profile">View profile</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild className="sm:w-auto">
                        <Link href="/register">Sign up to try it</Link>
                      </Button>
                      <Button asChild variant="outline" className="sm:w-auto">
                        <Link href="/login">Log in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </section>

        {/* FEATURES (grounded in current app) */}
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Application workflow</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Create and manage applications so follow-ups and context stay organized.
              <br/><br/>
              Control and track your applications in a fast table with sorting, filtering, and column controls.
              Open any application in a detail drawer to view and edit fields, upload documents, manage connections, and run AI tools.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">AI tools + credits</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              5 AI tools built into the workflow: JD extraction, compatibility check, resume advice, cover letter generation, and interview prep.
              <br/><br/>
              Targeted versions run inside the application drawer; generic versions live on the Tools page.
              <br/><br/>
              Includes 5 free credits on sign up, with a Pro request flow to unlock more.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Profile + activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Manage your CV / base resume and cover letter template, update security settings, and request Pro access.
              <br/><br/>
              Track your personal activity — AI runs completed, tools used, and generated artifacts — from the Activity page.
            </CardContent>
          </Card>
        </section>

        {!showAuthedActions && (
          <section className="mt-10 rounded-lg border bg-muted/20 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Ready to organize your search?</div>
                <div className="text-sm text-muted-foreground">
                  Create an account and start tracking in under a minute. Sign up with email or continue with Google.
                </div>
              </div>

              <Button asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full px-20 py-6 text-xs text-muted-foreground">
          Built with Next.js + Fastify + PostgreSQL.
        </div>
      </footer>
    </div>
  );
}