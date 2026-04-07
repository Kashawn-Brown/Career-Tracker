"use client";

import type { ResumeAdvicePayload } from "@/types/api";

interface Props {
  payload: ResumeAdvicePayload;
}

export function ResumeAdviceResult({ payload }: Props) {
  return (
    <div className="space-y-5 text-sm">
      {/* Summary */}
      <p className="text-muted-foreground leading-relaxed">{payload.summary}</p>

      <Section title="What's working"    items={payload.strengths}     accent="green"  />
      <Section title="Areas to improve"  items={payload.improvements}  accent="amber"  />
      <Section title="Role alignment"    items={payload.roleAlignment} accent="blue"   />
      <Section title="Rewrite suggestions" items={payload.rewrites}    accent="purple" />

      {/* Keywords — merged chip view with present/missing classification */}
      <KeywordsSection
        present={payload.keywordsPresent}
        missing={payload.keywordsMissing}
      />
    </div>
  );
}

function Section({
  title,
  items,
  accent,
}: {
  title:  string;
  items?: string[];
  accent: "green" | "amber" | "blue" | "purple";
}) {
  if (!items?.length) return null;

  const dotColor = {
    green:  "bg-green-500",
    amber:  "bg-amber-500",
    blue:   "bg-blue-500",
    purple: "bg-purple-500",
  }[accent];

  return (
    <div>
      <h4 className="mb-2 font-medium text-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * KeywordsSection — renders present and missing keywords as a single mixed
 * chip group. Green = already in resume (keep it). Amber = not found (worth adding).
 * A small legend explains the colour coding so users don't have to guess.
 */
function KeywordsSection({
  present,
  missing,
}: {
  present?: string[];
  missing?: string[];
}) {
  const hasPresent = (present?.length ?? 0) > 0;
  const hasMissing = (missing?.length ?? 0) > 0;
  if (!hasPresent && !hasMissing) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-foreground">Keywords</h4>
        {/* Legend — only shown when both types are present */}
        {hasPresent && hasMissing && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Already covered
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Worth adding
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {present?.map((kw) => (
          <span
            key={`present-${kw}`}
            className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
            {kw}
          </span>
        ))}
        {missing?.map((kw) => (
          <span
            key={`missing-${kw}`}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}