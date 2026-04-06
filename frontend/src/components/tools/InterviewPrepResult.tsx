"use client";

import { cn } from "@/lib/utils";
import type { InterviewPrepPayload, FocusTopic, FocusTopicPriority } from "@/types/api";

interface Props {
  payload: InterviewPrepPayload;
}

/**
 * InterviewPrepResult — shared result renderer for both generic and targeted prep.
 *
 * Used by:
 *   - GenericInterviewPrepCard (Tools page inline result)
 *   - PastRunsSection (expanded past run)
 *   - InterviewPrepReport (full drawer panel)
 *
 * Renders focus topics with priority chips, grouped question banks, and
 * questions to ask the interviewer. No answers — questions only.
 */
export function InterviewPrepResult({ payload }: Props) {
  return (
    <div className="space-y-6 text-sm">

      {/* Summary */}
      <p className="text-muted-foreground leading-relaxed">{payload.summary}</p>

      {/* Focus topics — shown first so the candidate knows where to spend time */}
      {payload.focusTopics?.length > 0 && (
        <FocusTopicsSection topics={payload.focusTopics} />
      )}

      {/* Question banks — grouped by type */}
      <QuestionSection title="Background questions"   questions={payload.backgroundQuestions} />
      <QuestionSection title="Technical questions"    questions={payload.technicalQuestions} />
      <QuestionSection title="Behavioural questions"  questions={payload.behavioralQuestions} />
      <QuestionSection title="Situational questions"  questions={payload.situationalQuestions} />
      <QuestionSection title="Motivational questions" questions={payload.motivationalQuestions} />
      <QuestionSection title="Challenge questions"    questions={payload.challengeQuestions} />

      {/* Questions to ask — visually distinct since these are outbound */}
      {payload.questionsToAsk?.length > 0 && (
        <div className="rounded-md border bg-muted/20 p-4 space-y-2">
          <div className="text-md font-medium">Questions to ask the interviewer</div>
          <ul className="space-y-1.5">
            {payload.questionsToAsk.map((q, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span className="leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}


// ─── Focus topics ─────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<FocusTopicPriority, { label: string; className: string }> = {
  HIGH:   { label: "High",   className: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400   border-red-200   dark:border-red-800" },
  MEDIUM: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  LOW:    { label: "Low",    className: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
};

function FocusTopicsSection({ topics }: { topics: FocusTopic[] }) {
  return (
    <div className="space-y-2">
      <div className="text-md font-medium">Focus topics</div>
      <div className="space-y-2">
        {topics.map((t, i) => {
          const config = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.MEDIUM;
          return (
            <div key={i} className="flex items-start gap-3 rounded-md border p-3">
              {/* Priority chip */}
              <span className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium mt-0.5",
                config.className
              )}>
                {config.label}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground">{t.topic}</div>
                {t.reason && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.reason}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Question section ─────────────────────────────────────────────────────────

/**
 * Renders a titled list of questions.
 * Hidden entirely when the array is empty — no empty-state message needed
 * here since empty simply means nothing was generated for that category.
 */
function QuestionSection({ title, questions }: { title: string; questions?: string[] }) {
  if (!questions?.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-md font-medium">{title}</div>
      <ul className="space-y-1.5">
        {questions.map((q, i) => (
          <li key={i} className="flex gap-2 text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            <span className="leading-relaxed">{q}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}