"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, Linkedin, Globe, Coffee, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Track everything in one place",
    body: "Applications, statuses, notes, documents, and contacts. Fast table-first view with filters, sorting, and column controls. Open any application in a details drawer to view, edit, and act.",
  },
  {
    title: "AI JD extraction",
    body: "Paste or link a job description and Career-Tracker extracts the role details, generates a structured summary, and prefills your application automatically.",
  },
  {
    title: "Compatibility scoring",
    body: "See how well you match a role — not just a trimmed resume. Career-Tracker reads your full career history and determines what's working for you, what the role needs, and where the gaps are.",
  },
  {
    title: "Resume advice",
    body: "Targeted improvement suggestions for a specific role — what's working, what to fix, rewrite suggestions, and keyword coverage split into already-covered and worth-adding.",
  },
  {
    title: "Cover letter generation",
    body: "A tailored draft built from the actual job description and your background. Not a template — a real draft with evidence, notes, and placeholders to personalise.",
  },
  {
    title: "Interview prep",
    body: "A full prep pack: focus topics with priority, question bank across every category (background, technical, behavioural, situational, motivational, challenge), and questions to ask the interviewer.",
  },
];

// ─── Contact form ─────────────────────────────────────────────────────────────

type FormState = "idle" | "submitting" | "success" | "error";

function ContactForm() {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("https://formspree.io/f/xzdypkjp", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body:    JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus("success");
        setName(""); setEmail(""); setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <p className="font-medium">Message sent — thanks!</p>
        <p className="text-sm text-muted-foreground">{"I'll get back to you as soon as I can."}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Name
          </label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Message
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind? A bug, an idea, or just a note — all welcome."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Something went wrong — please try again or email me directly.
        </div>
      )}

      <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
        <Send className="mr-2 h-4 w-4" />
        {status === "submitting" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const { isAuthenticated, isHydrated } = useAuth();
  const isLoggedIn = isHydrated && isAuthenticated;

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-12 sm:px-6 lg:px-8 space-y-16">

      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Built for the modern job search.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Career-Tracker is an AI-powered job application manager built by a developer
          who got tired of losing track of applications in spreadsheets — JDs, tailored
          documents, connections built along the way, all scattered across chats and files.
          The AI side had already become a part of the process too: checking compatibility,
          tailoring resumes, drafting cover letters, helping prepare for interviews.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This brings all of it into one place. It started as a personal tool — and has now become a full platform.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {!isLoggedIn && (
            <Button asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
      </section>

      {/* The problem */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">The problem</p>
        <h2 className="text-xl font-semibold tracking-tight">Job searching is a full-time job.</h2>
        <p className="text-muted-foreground leading-relaxed">
          Between tracking applications, tailoring resumes, writing cover letters, and prepping for
          interviews — it&apos;s easy to fall behind. Most trackers are just glorified spreadsheets.
          Career-Tracker brings the whole workflow into one place and uses AI to do the heavy lifting.
        </p>
      </section>

      {/* Features */}
      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">What it does</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ title, body }) => (
            <div key={title} className="rounded-lg border bg-muted/20 p-4 space-y-1.5">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built by */}
      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">The builder</p>
        <div className="rounded-lg border bg-muted/20 p-6 space-y-3">
          <h2 className="text-lg font-semibold">Built by Kashawn Brown</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Software developer based in Toronto, Canada. I built Career-Tracker because I wanted
            a smarter way to manage my own job search and nothing out there did exactly what I needed.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              href="https://github.com/Kashawn-Brown"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/kashawn-brown/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
            <a
              href="https://kashawn-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-4 w-4" />
              Portfolio
            </a>            
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Support the project</p>
        <div className="rounded-lg border bg-muted/20 p-6 space-y-3">
          <h2 className="text-lg font-semibold">Keep Career-Tracker running</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Career-Tracker is independently built and maintained. If it&apos;s helped your job search,
            and you&apos;d like to help support, consider buying me a coffee. 
            It goes directly toward server costs and keeping the AI features running.
          </p>
          <a
            href="https://buymeacoffee.com/kashawnbrown"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90",
              "bg-[#FFDD00] text-[#000000]"
            )}
          >
            <Coffee className="h-4 w-4" />
            Buy me a coffee
          </a>
        </div>
      </section>

      {/* Testimonials — hidden for now, easy to unhide */}
      {/* 
      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">What people are saying</p>
        <div className="grid gap-4 sm:grid-cols-2">
          placeholder testimonial cards
        </div>
      </section>
      */}

      {/* Contact */}
      {isLoggedIn && (
        <section className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Get in touch</p>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Have feedback or ran into an issue?</h2>
            <p className="text-sm text-muted-foreground">
              Career-Tracker is actively being improved. If something isn&apos;t working, you have an idea,
              or you just want to share how it&apos;s going — I&apos;d love to hear from you.
            </p>
          </div>
          <ContactForm />
        </section>
      )}

      {/* Footer nudge — only shown to logged-out visitors */}
      {!isLoggedIn && (
        <section className="rounded-lg border bg-muted/20 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Ready to organize your search?</p>
              <p className="text-sm text-muted-foreground">
                Create an account and start tracking in under a minute.
              </p>
            </div>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </section>
      )}

    </div>
  );
}