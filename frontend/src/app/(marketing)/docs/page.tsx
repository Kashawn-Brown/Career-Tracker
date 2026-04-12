"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocSection = {
  id:       string;
  label:    string;
  children: DocPage[];
};

type DocPage = {
  id:    string;
  label: string;
};

// ─── Sidebar structure ────────────────────────────────────────────────────────

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    children: [
      { id: "introduction", label: "Introduction"  },
      { id: "quick-start",  label: "Quick Start"   },
    ],
  },
  {
    id: "features",
    label: "Features",
    children: [
      { id: "applications", label: "Applications"  },
      { id: "ai-tools",     label: "AI Tools"      },
      { id: "base-resume",  label: "Base Resume"   },
      { id: "documents",    label: "Documents"     },
      { id: "connections",  label: "Connections"   },
    ],
  },
  {
    id: "credits",
    label: "Credits & Plans",
    children: [
      { id: "how-credits-work", label: "How Credits Work" },
      { id: "plans",            label: "Plans"            },
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    children: [
      { id: "faq-general", label: "General" },
    ],
  },
  {
    id: "changelog",
    label: "Changelog",
    children: [
      { id: "changelog-latest", label: "Latest" },
    ],
  },
];

// ─── Doc content ──────────────────────────────────────────────────────────────

const CONTENT: Record<string, React.ReactNode> = {

  introduction: (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Introduction</h1>
      <p className="text-muted-foreground leading-relaxed">
        Career-Tracker is an AI-powered job application tracker built for developers and job seekers 
        who want more than a spreadsheet and one organized place for their search. 
        Track your applications, extract job descriptions automatically, check your compatibility with a role, 
        generate cover letters, and prepare for interviews — the same things you were probably already doing, 
        just organized and all in one place.
      </p>
      <p className="text-muted-foreground leading-relaxed">
        The UI is built around a fast table-first experience. Scanning and filtering stays instant in
        the table, while richer details — documents, connections, notes, and AI tools — live in a
        details drawer without cluttering the main view.
      </p>
      <div className="rounded-md border bg-muted/20 p-4 space-y-2">
        <p className="text-sm font-medium">What you can do with Career-Tracker:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Track job applications with statuses, notes, documents, and connections</li>
          <li>Extract structured details from a job posting via link or paste</li>
          <li>Run AI tools (compatibility check, resume advice, cover letter, interview prep) per application</li>
          <li>Use generic versions of each AI tool on the Tools page without a specific application</li>
          <li>Upload and manage your base resume, documents, and connections</li>
          <li>Monitor your AI credit usage and request more from your profile</li>
        </ul>
      </div>
    </div>
  ),

  "quick-start": (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Quick Start</h1>
      <p className="text-muted-foreground">Get up and running in under 5 minutes.</p>
      <ol className="space-y-4">
        {[
          ["Create an account", "Sign up with email or continue with Google. Verify your email to unlock the dashboard and AI tools."],
          ["Upload your base resume", "Go to Profile → Documents and upload your full career history. The more complete it is, the better your AI results. See the Base Resume section for what this means."],
          ["Add your first application", "Click + Add application. Paste a job posting link and Career-Tracker will extract the role details automatically, or fill in the fields manually."],
          ["Run a Compatibility Check", "Open an application from the table. In the AI Tools tab, run a Compatibility Check to see how well you match the role."],
          ["Use the other AI tools", "Resume Advice, Cover Letter, and Interview Prep are all in the same drawer tab. Generic versions are available on the Tools page without needing a specific application."],
        ].map(([title, body], i) => (
          <li key={title as string} className="flex gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  ),

  applications: (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
      <p className="text-muted-foreground leading-relaxed">
        The Applications table is your home base. Every application you add appears here with
        sortable columns, filters, and column visibility controls.
      </p>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Table</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sort by company, position, compatibility score, date applied, or last updated.
          Filter by status, job type, or work arrangement. Hide columns you don&apos;t need
          via the Column Controls button. Your column and sort preferences are saved.
        </p>
      </div>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Details drawer</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click any row to open the details drawer. The drawer opens in view mode by default —
          click Edit to make changes, then Save or Cancel. Tabs in the drawer cover:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li><span className="font-medium text-foreground">Details</span> — all application fields including job description, notes, and salary</li>
          <li><span className="font-medium text-foreground">AI Tools</span> — compatibility check, resume advice, cover letter, interview prep</li>
          <li><span className="font-medium text-foreground">Documents</span> — application-specific file uploads</li>
          <li><span className="font-medium text-foreground">Connections</span> — people associated with this application (recruiters, referrals, etc.)</li>
        </ul>
      </div>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Status</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Change an application&apos;s status directly from the table by clicking the status pill.
          Available statuses: Wishlist, Interested, Applied, Interview, Offer, Rejected, Withdrawn.
        </p>
      </div>
    </div>
  ),

  "ai-tools": (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">AI Tools</h1>
      <p className="text-muted-foreground leading-relaxed">
        Career-Tracker has 5 AI tools. Four run per-application from the drawer (require a job description).
        Three also have generic versions on the Tools page (no JD required).
      </p>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Per-application tools</h2>
        <p className="text-sm text-muted-foreground">Found in the AI Tools tab of the application drawer. All require a job description on the application.</p>
        <div className="space-y-3">
          {[
            ["JD Extraction", "1 credit", "Paste or link a job posting and Career-Tracker extracts the role title, company, location, salary, job type, work mode, and a structured summary. Runs automatically on application creation from a link."],
            ["Compatibility Check", "2 credits", "Scores how well you match a specific role based on your full career history. Returns a score, strengths, gaps, role signals, and prep areas. AI tools run in the background and survive drawer close."],
            ["Resume Advice", "2 credits", "Targeted suggestions for a specific role — what's working, what to improve, rewrite suggestions, and keyword coverage split into already-covered and worth-adding."],
            ["Cover Letter", "3 credits", "A tailored draft based on the job description and your background. Includes evidence bullets, notes, and placeholders to personalise. You can optionally provide a base cover letter template."],
            ["Interview Prep", "3 credits", "A full prep pack: focus topics with priority, question bank across background, technical, behavioural, situational, motivational, and challenge categories, plus questions to ask the interviewer."],
          ].map(([title, cost, body]) => (
            <div key={title as string} className="rounded-md border bg-muted/20 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{title}</p>
                <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">{cost}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Generic tools (Tools page)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Resume Advice, Cover Letter, and Interview Prep are also available on the Tools page
          without needing a specific application. Results are saved per user (capped at 3 per tool —
          oldest is removed when you exceed the cap). Useful for general prep or exploring a field
          before you have a specific role in mind.
        </p>
      </div>
    </div>
  ),

  "base-resume": (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Base Resume</h1>
      <div className="rounded-md border-l-4 border-primary bg-muted/20 px-4 py-3 space-y-1">
        <p className="text-sm font-medium">Your base resume isn&apos;t a job application — it&apos;s your career document.</p>
      </div>
      <p className="text-muted-foreground leading-relaxed text-sm">
        Most resume tools ask you to upload a tailored, trimmed resume for a specific role.
        Career-Tracker works differently. Your base resume (or CV) should be a comprehensive
        record of everything you&apos;ve done — every role, project, skill, certification, and
        accomplishment — without worrying about length or targeting.
      </p>
      <p className="text-muted-foreground leading-relaxed text-sm">
        Think of it as your master career document. When you run a Compatibility Check, Resume Advice,
        Cover Letter, or Interview Prep, Career-Tracker&apos;s AI reads through your full history and
        determines what&apos;s actually relevant to the role you&apos;re targeting. It does the filtering.
        You don&apos;t have to.
      </p>
      <div className="rounded-md border bg-muted/20 p-4 space-y-2">
        <p className="text-sm font-medium">What to include:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Every role you&apos;ve held — full-time, part-time, contract, internship</li>
          <li>Projects — personal, academic, open-source</li>
          <li>Skills — technical and soft</li>
          <li>Education, certifications, courses</li>
          <li>Accomplishments and metrics where you have them</li>
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        The more complete your base resume is, the better your AI results will be.
        Upload it under <span className="font-medium text-foreground">Profile → Documents</span>.
        Accepted formats: PDF, DOCX, TXT.
      </p>
    </div>
  ),

  documents: (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      <p className="text-muted-foreground leading-relaxed">
        Career-Tracker supports two types of document storage.
      </p>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Profile documents</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Managed under Profile → Documents. These are global documents that apply across all applications.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li><span className="font-medium text-foreground">Base Resume</span> — your full career document used by AI tools</li>
          <li><span className="font-medium text-foreground">Base Cover Letter</span> — an optional template Career-Tracker uses as a starting point when generating cover letters</li>
        </ul>
      </div>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Application documents</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Uploaded from the Documents tab inside an application drawer. These are specific to that
          application — tailored resumes, role-specific cover letters, reference letters, etc.
          Accepted formats: PDF, DOCX, TXT.
        </p>
      </div>
    </div>
  ),

  connections: (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
      <p className="text-muted-foreground leading-relaxed">
        Connections are people you interact with during your job search — recruiters, hiring managers,
        referrals, and contacts at companies you&apos;re targeting.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Create and manage connections globally from your Profile, then attach them to specific
        applications from the Connections tab in the drawer. A connection can be attached to
        multiple applications.
      </p>
    </div>
  ),

  "how-credits-work": (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">How Credits Work</h1>
      <p className="text-muted-foreground leading-relaxed">
        AI features consume credits. Credits are allocated monthly and reset at the start of each
        billing cycle. Credits are only consumed on successful runs — a failed or cancelled run
        does not count against your balance.
      </p>
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Credit costs per tool</h2>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium text-xs">
                <th>Tool</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-t">
              {[
                ["JD Extraction",     "1"],
                ["Compatibility Check", "2"],
                ["Resume Advice",     "2"],
                ["Cover Letter",      "3"],
                ["Interview Prep",    "3"],
              ].map(([tool, cost]) => (
                <tr key={tool} className="[&>td]:px-4 [&>td]:py-2">
                  <td>{tool}</td>
                  <td className="text-muted-foreground">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Running low? You&apos;ll see a warning at 90% usage. Request more credits from your
        {" "}<span className="font-medium text-foreground">Profile</span> page — requests are
        reviewed manually.
      </p>
    </div>
  ),

  plans: (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium text-xs">
              <th>Plan</th>
              <th>Monthly Credits</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody className="[&>tr:not(:last-child)]:border-t">
            <tr className="[&>td]:px-4 [&>td]:py-2">
              <td className="font-medium">Regular</td>
              <td className="text-muted-foreground">100</td>
              <td className="text-muted-foreground">Default on sign up</td>
            </tr>
            <tr className="[&>td]:px-4 [&>td]:py-2">
              <td className="font-medium">Pro</td>
              <td className="text-muted-foreground">1,200</td>
              <td className="text-muted-foreground">Request from Profile</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Pro access is granted manually. Request it from your Profile page and an admin will review it.
      </p>
    </div>
  ),

  "faq-general": (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">FAQ</h1>
      <div className="space-y-4">
        {[
          ["What happens when I run out of credits?",
           "AI tools are unavailable until your credits reset at the start of next month. You can request more from your Profile page."],
          ["Is my data private?",
           "Yes. Your documents are stored in a private bucket and are only accessible to you via short-lived signed URLs. Nothing is shared."],
          ["Can I export my applications?",
           "Yes. Use the Export button on the Applications page to download a CSV of your applications."],
          ["What file types are supported for document uploads?",
           "PDF, DOCX, and TXT are accepted for all document upload points."],
          ["How accurate is the compatibility score?",
           "It's AI-generated based on your career history and the job description text. It's a useful signal and directional guide — not a guarantee of how a recruiter or ATS will assess you."],
          ["Do AI tools run even if I close the drawer?",
           "Yes. AI tools run in the background and survive drawer close. A notification will appear when results are ready."],
          ["What is a base resume vs a tailored resume?",
           "Your base resume is your full career document — everything you've ever done. A tailored resume is a shortened version targeting a specific role. Career-Tracker uses your base resume for AI tools so it has the full picture. See the Base Resume section for more detail."],
        ].map(([q, a]) => (
          <div key={q as string} className="space-y-1.5">
            <p className="text-sm font-medium">{q}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  ),

  "changelog-latest": (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Changelog</h1>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">April 2026 — Phase 11</p>
            <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">Latest</span>
          </div>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Real-time credit usage updates after every AI run</li>
            <li>Drawer blocked states — cards collapse form content when credits are exhausted</li>
            <li>Tools page blocked state and low-credit warning banner</li>
            <li>Admin table improvements — role/status filters, sortable columns, pending credit request badges</li>
            <li>UserDetailSheet consolidation — Credits & Access section replaces three separate panels</li>
            <li>Applications table sort indicators always visible; case-insensitive company/position sort</li>
            <li>Legacy credit system fully removed — all AI gating now via monthly PlanUsageCycle</li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Earlier phases</p>
          <p className="text-sm text-muted-foreground">
            View the full history on{" "}
            <a
              href="https://github.com/Kashawn-Brown/Career-Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              GitHub →
            </a>
          </p>
        </div>
      </div>
    </div>
  ),
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id))
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="space-y-1">
      {SECTIONS.map((section) => {
        const isOpen = openSections.has(section.id);
        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {section.label}
              {isOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />
              }
            </button>
            {isOpen && (
              <div className="ml-2 mt-0.5 space-y-0.5">
                {section.children.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => onSelect(page.id)}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors",
                      activeId === page.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeId, setActiveId] = useState("introduction");

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
      <div className="flex gap-8 py-8">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
          <Sidebar activeId={activeId} onSelect={setActiveId} />
        </aside>

        {/* Mobile section picker */}
        <div className="lg:hidden w-full mb-4">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SECTIONS.map((section) => (
              <optgroup key={section.id} label={section.label}>
                {section.children.map((page) => (
                  <option key={page.id} value={page.id}>{page.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Content */}
        <article className="min-w-0 flex-1 max-w-5xl">
          {CONTENT[activeId] ?? (
            <div className="text-sm text-muted-foreground">Page not found.</div>
          )}
        </article>

      </div>
    </div>
  );
}