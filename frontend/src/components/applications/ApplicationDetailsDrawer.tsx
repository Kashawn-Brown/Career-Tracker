"use client";

// ApplicationDetailsDrawer.tsx: a drawer component for the app to use for displaying application details

import type { Application } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";

// A helper function to format the date applied
function dateAppliedFormat(dateIso: string) {
  const applied = new Date(dateIso);
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAgo = Math.floor((now.getTime() - applied.getTime()) / msPerDay);

  const dateText = applied.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!Number.isFinite(daysAgo) || daysAgo < 0) return dateText;

  if (daysAgo === 0) return `${dateText} (today)`;
  if (daysAgo === 1) return `${dateText} (1 day ago)`;
  return `${dateText} (${daysAgo} days ago)`;
}

// A helper component to display a section of the application details
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="rounded-md border bg-muted/10 p-3 text-sm">
        {children}
      </div>
    </div>
  );
}

// A helper component to display a field of the application details
function Field({ label, value, details, emptyValue = "—" }: { label: string; value?: string | null | undefined; details?: string | null; emptyValue?: string }) {

  const primary = value?.trim() ? value.trim() : emptyValue;
  const secondary = details?.trim() ? details.trim() : null;

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="space-y-1">
        <div className="text-sm">{primary}</div>
        {/* Detail is only shown when present */}
        {secondary ? (
          <div className="text-xs text-muted-foreground font-light">{secondary}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ApplicationDetailsDrawer({
  open,
  onOpenChange,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
}) {

  // Format the title of the drawer
  const title = application
  ? `${application.isFavorite ? "⭐ " : ""}${application.position} @ ${application.company}`
  : "Application details";

  // Format the tags of the application (comma-separated list of tags)
  const tags =
    application?.tagsText
      ? application.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="space-y-5">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {application
              ? `Status: ${statusLabel(application.status)} • Updated: ${new Date(application.updatedAt).toLocaleString()}`
              : "Select an application to view details."}
          </SheetDescription>
        </SheetHeader>

        {!application ? (
          <div className="text-sm text-muted-foreground">No application selected.</div>
        ) : (
          <div className="space-y-5">
            <Section title="Job details">
              <div className="space-y-2">
                  <Field label="Company" value={application.company} />
                  <Field label="Position" value={application.position} />
                  <Field label="Salary" value={application.salaryText} emptyValue="Not specified" />
                  <Field label="Job type" value={jobTypeLabel(application.jobType)} details={application.jobTypeDetails} />
                  <Field label="Work mode" value={workModeLabel(application.workMode)} details={application.workModeDetails} />
                  {application.dateApplied ? (
                    <Field
                      label="Date applied"
                      value={dateAppliedFormat(application.dateApplied)}
                    />
                  ) : null}
              </div>
            </Section>

            <Section title="Job link">
              {application.jobLink ? (
                <a
                  href={application.jobLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline underline-offset-4"
                >
                  {application.jobLink}
                </a>
              ) : (
                <span className="text-muted-foreground">No job link available</span>
              )}
            </Section>

            <Section title="Tags">
              {tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full border px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">No tags</span>
              )}
            </Section>

            <Section title="Notes">
              {application.notes ? (
                <div className="whitespace-pre-wrap">{application.notes}</div>
              ) : (
                <span className="text-muted-foreground">No notes</span>
              )}
            </Section>

            <Section title="Job description">
              {application.description ? (
                <div className="max-h-[45vh] overflow-auto whitespace-pre-wrap">
                  {application.description}
                </div>
              ) : (
                <span className="text-muted-foreground">No job description available</span>
              )}
            </Section>

            <Section title="AI">
              <span className="text-muted-foreground">
                Coming soon: summary, fit rating, and tailored docs.
              </span>
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
