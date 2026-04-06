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

      <Section title="Strengths" items={payload.strengths} accent="green" />
      <Section title="Improvements" items={payload.improvements} accent="amber" />
      <Section title="Tailoring suggestions" items={payload.tailoring} accent="blue" />
      <Section title="Rewrite suggestions" items={payload.rewrites} accent="purple" />

      {payload.keywords.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-foreground">Keywords to cover</h4>
          <div className="flex flex-wrap gap-1.5">
            {payload.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "green" | "amber" | "blue" | "purple";
}) {
  if (!items.length) return null;

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