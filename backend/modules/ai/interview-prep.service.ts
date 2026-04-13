/**
 * interview-prep.service.ts
 *
 * AI service builders for the Interview Prep tool:
 *   - buildGenericInterviewPrep  — prep from resume/history alone (no specific job)
 *   - buildTargetedInterviewPrep — prep shaped by a specific JD + optional resume
 *
 * Both builders share the same payload shape (InterviewPrepPayload) so the
 * frontend uses one result component for both variants.
 *
 * Design rules (non-negotiable):
 *   - Questions and topics only — no model-generated answers or ideal responses
 *   - Never invent resume facts, metrics, employers, or technologies
 *   - Empty arrays are valid — do not manufacture content to fill fields
 *   - Generic prep requires a resume; targeted prep requires a JD, resume optional
 */

import { AppError }                      from "../../errors/app-error.js";
import { getOpenAIClient, AI_MODELS }    from "./openai.js";
import type { DocumentToolResult, TokenUsage } from "./document-tools.service.js";
import type { ExecutionProfile } from "../plan/entitlement-policy.js";
import { throwIfAborted }                from "../../lib/request-abort.js";
import {
  InterviewPrepJsonObject,
  normalizeInterviewPrep,
  type InterviewPrepPayload,
} from "./interview-prep.dto.js";


// ─── Token budget ─────────────────────────────────────────────────────────────

// Interview prep generates many questions across several categories — needs
// more headroom than resume advice but less than cover letter draft.
const INTERVIEW_PREP_MAX_TOKENS = 5_000;


// ─── Input types ──────────────────────────────────────────────────────────────

export type GenericInterviewPrepInput = {
  candidateText:      string;   // required — resume/career history text
  targetField?:       string;   // e.g. "Software Engineering"
  targetRolesText?:   string;   // e.g. "Backend Engineer, API Developer"
  additionalContext?: string;   // any other context the user wants to provide
  signal?:            AbortSignal
  profile?: ExecutionProfile;
};

export type TargetedInterviewPrepInput = {
  jdText:         string;         // required — job description text
  candidateText?: string | null;  // optional — resume text if available
  signal?:        AbortSignal
  profile?: ExecutionProfile;
};


// ─── Token usage helper ──────────────────────────────────────────────────────

function extractTokenUsage(resp: any): TokenUsage {
  const u = resp?.usage ?? {};
  const input  = u.input_tokens  ?? u.prompt_tokens     ?? 0;
  const output = u.output_tokens ?? u.completion_tokens ?? 0;
  return { input, output, total: u.total_tokens ?? (input + output) };
}


// ─── Generic Interview Prep ───────────────────────────────────────────────────

/**
 * Generates interview prep based on the user's resume/career history.
 *
 * Focus: help the candidate defend and explain their own background —
 * projects, decisions, skills, gaps, and career narrative.
 * No job-specific framing; this is self-defense prep.
 *
 * Resume is required because without it the output would be generic
 * boilerplate that applies to any candidate.
 */
export async function buildGenericInterviewPrep(
  input: GenericInterviewPrepInput
): Promise<DocumentToolResult<InterviewPrepPayload>> {
  const { candidateText, targetField, targetRolesText, additionalContext, signal } = input;

  if (!candidateText?.trim()) {
    throw new AppError("Resume text is required for interview prep.", 400, "RESUME_TEXT_MISSING");
  }

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.INTERVIEW_PREP,
      input: [
        { role: "system", content: buildInterviewPrepSystemPrompt("generic") },
        { role: "user",   content: buildGenericUserPrompt({ candidateText, targetField, targetRolesText, additionalContext }) },
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "interview_prep_generic",
          strict: true,
          schema: InterviewPrepJsonObject,
        },
      },
      reasoning:         { effort: input.profile?.effort ?? "medium" },
      max_output_tokens: INTERVIEW_PREP_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseInterviewPrepResponse(resp, "interview_prep_generic");
  return { payload: normalizeInterviewPrep(parsed), usage: extractTokenUsage(resp) };
}


// ─── Targeted Interview Prep ──────────────────────────────────────────────────

/**
 * Generates interview prep shaped by a specific job description.
 *
 * Focus: role-specific topics, likely interviewer questions, and (when a
 * resume is provided) how the candidate's background will be probed in the
 * context of this particular role.
 *
 * JD is required. Resume is optional — without it the tool still produces
 * role topics, role questions, and interviewer questions from the JD alone.
 * With a resume it additionally generates background-defense and challenge
 * questions grounded in the candidate's actual history vs the role.
 */
export async function buildTargetedInterviewPrep(
  input: TargetedInterviewPrepInput
): Promise<DocumentToolResult<InterviewPrepPayload>> {
  const { jdText, candidateText, signal } = input;

  if (!jdText?.trim()) {
    throw new AppError("Job description is required for targeted interview prep.", 400, "JOB_DESCRIPTION_MISSING");
  }

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.INTERVIEW_PREP,
      input: [
        { role: "system", content: buildInterviewPrepSystemPrompt("targeted") },
        { role: "user",   content: buildTargetedUserPrompt({ jdText, candidateText: candidateText ?? null }) },
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "interview_prep_targeted",
          strict: true,
          schema: InterviewPrepJsonObject,
        },
      },
      reasoning:         { effort: input.profile?.effort ?? "medium" },
      max_output_tokens: INTERVIEW_PREP_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseInterviewPrepResponse(resp, "interview_prep_targeted");
  return { payload: normalizeInterviewPrep(parsed), usage: extractTokenUsage(resp) };
}


// ─── Prompts ──────────────────────────────────────────────────────────────────

/**
 * Shared system prompt for both generic and targeted interview prep.
 * Mode-specific instructions are layered on top via the user prompt.
 */
function buildInterviewPrepSystemPrompt(mode: "generic" | "targeted"): string {
  const modeContext = mode === "generic"
    ? [
        "You are helping a candidate prepare to explain and defend their own background.",
        "Focus entirely on the candidate's history, decisions, projects, and skills.",
        "There is no specific job — this is general self-defense and interview readiness prep.",
      ]
    : [
        "You are helping a candidate prepare for an interview for a specific job.",
        "Shape everything around what THIS role is likely to probe.",
        "If a resume is provided, connect it to the role — identify both alignment and likely challenge areas.",
        "If no resume is provided, generate role-specific prep from the JD alone.",
      ];

  return [
    ...modeContext,
    "",
    "Return ONLY valid JSON matching the provided schema. No markdown. No commentary.",
    "",
    "TRUTHFULNESS RULES (non-negotiable):",
    "- Do NOT invent resume facts, projects, metrics, employers, titles, dates, or technologies.",
    "- Questions must be grounded in the candidate's actual stated experience or the JD's actual requirements.",
    "- Do NOT generate model answers, ideal responses, or example replies.",
    "  This tool produces questions and topics — not answers. The candidate supplies the answers.",
    "",
    "ANTI-OVERFITTING RULE (important):",
    "- Return an EMPTY ARRAY for any field where you have nothing genuine to say.",
    "- Do NOT manufacture questions or topics to fill a field.",
    "- Do NOT repeat the same question across multiple categories.",
    "",
    "OUTPUT RULES:",
    "",
    "- summary: 2–3 sentences. What this prep covers and what the candidate should prioritise.",
    "",
    "- focusTopics: up to 8 topics the candidate should spend time preparing.",
    "  Each topic needs: topic name, priority (HIGH/MEDIUM/LOW), and a brief reason why.",
    "  HIGH = likely to come up and candidate may be weak; MEDIUM = expected, probably fine;",
    "  LOW = good-to-know but unlikely to be a deciding factor.",
    "",
    "- backgroundQuestions: up to 8 questions about career path, role decisions, and history.",
    "  Grounded in the candidate's actual background. Empty if no resume provided (generic) or",
    "  no meaningful background questions arise.",
    "",
    "- technicalQuestions: up to 8 questions about technical skills, tools, stack, or domain knowledge.",
    "  For targeted: grounded in the JD's required stack. For generic: grounded in the resume.",
    "",
    "- behavioralQuestions: up to 8 'Tell me about a time when…' style questions.",
    "  Grounded in real experience — do not ask about scenarios the candidate has no evidence for.",
    "",
    "- situationalQuestions: up to 6 'What would you do if…' style questions.",
    "  Should reflect realistic scenarios for this kind of role or seniority level.",
    "",
    "- motivationalQuestions: up to 6 questions about why this field, company, role, or career direction.",
    "",
    "- challengeQuestions: up to 6 questions that probe weak spots, gaps, or areas the interviewer",
    "  may push back on. For targeted: based on fit gaps between candidate and JD.",
    "  For generic: based on potential weak areas in the candidate's record.",
    "  Empty array if no clear challenge areas exist.",
    "",
    "- questionsToAsk: up to 6 strong questions the candidate should ask the interviewer.",
    "  For targeted: specific to this role/company from the JD. For generic: thoughtful general questions.",
    "",
    "Avoid repetition across fields. If a topic is in focusTopics, questions about it should appear",
    "in the relevant question category — not duplicated across multiple categories.",
  ].join("\n");
}

/**
 * User prompt for generic prep — no JD, just resume + targeting context.
 */
function buildGenericUserPrompt(args: {
  candidateText:      string;
  targetField?:       string;
  targetRolesText?:   string;
  additionalContext?: string;
}): string {
  const lines: string[] = [];

  if (args.targetField)     lines.push(`TARGET FIELD: ${args.targetField}`);
  if (args.targetRolesText) lines.push(`TARGET ROLES: ${args.targetRolesText}`);
  if (args.additionalContext) {
    lines.push("", "ADDITIONAL CONTEXT:", args.additionalContext);
  }

  lines.push("", "CANDIDATE RESUME / CAREER HISTORY:", args.candidateText);
  lines.push(
    "",
    "Generate interview prep to help this candidate defend and explain their background.",
    "Focus on what they are likely to be asked about, what areas may be challenged,",
    "and what they should prepare to discuss confidently.",
  );

  return lines.join("\n");
}

/**
 * User prompt for targeted prep — JD required, resume optional.
 */
function buildTargetedUserPrompt(args: {
  jdText:         string;
  candidateText:  string | null;
}): string {
  const lines: string[] = [];

  lines.push("JOB DESCRIPTION:", args.jdText);

  if (args.candidateText?.trim()) {
    lines.push("", "CANDIDATE RESUME / CAREER HISTORY:", args.candidateText);
    lines.push(
      "",
      "Generate interview prep for this candidate applying to this specific role.",
      "Shape questions around what this role is likely to probe.",
      "Use the candidate's background to identify alignment and likely challenge areas.",
    );
  } else {
    lines.push(
      "",
      "No candidate resume is available.",
      "Generate interview prep from the job description alone.",
      "Focus on role-specific topics, technical areas, and likely interviewer questions.",
      "Leave backgroundQuestions and challengeQuestions empty unless they can be derived",
      "purely from the JD requirements.",
    );
  }

  return lines.join("\n");
}


// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Parses and validates the OpenAI structured output response.
 * Logs token usage for monitoring. Throws on incomplete or empty output.
 */
function parseInterviewPrepResponse(resp: any, tag: string): InterviewPrepPayload {
  const usage = {
    input:  resp?.usage?.input_tokens  ?? resp?.usage?.prompt_tokens    ?? 0,
    output: resp?.usage?.output_tokens ?? resp?.usage?.completion_tokens ?? 0,
  };

  console.log(JSON.stringify({
    msg:               "[ai.usage]",
    tag,
    id:                resp?.id    ?? null,
    model:             resp?.model ?? null,
    status:            resp?.status ?? null,
    incomplete_reason: resp?.incomplete_details?.reason ?? null,
    usage,
  }));

  const status = resp?.status ?? "unknown";
  if (status !== "completed") {
    throw new AppError(
      `AI did not complete (status=${status}, reason=${resp?.incomplete_details?.reason ?? "unknown"}, tokens=${usage.input + usage.output}).`,
      502,
      "AI_REFUSED"
    );
  }

  const outputText = (resp.output_text ?? "").trim();
  if (!outputText) {
    throw new AppError("AI completed but returned empty output.", 502, "AI_EMPTY_OUTPUT");
  }

  try {
    // Strip ```json fences if the model wraps the output
    const clean = outputText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
    return JSON.parse(clean) as InterviewPrepPayload;
  } catch {
    throw new AppError("AI returned invalid JSON.", 502, "AI_INVALID_JSON");
  }
}