/**
 * document-tools.service.ts
 *
 * AI service builders for document tools:
 *   - buildGenericResumeAdvice     — resume advice using base resume + targeting context
 *   - buildTargetedResumeAdvice    — resume advice for a specific job application
 *   - buildGenericCoverLetter      — reusable cover letter draft using base resume + context
 *   - buildTargetedCoverLetter     — cover letter draft for a specific job application
 *
 * All builders share the same output payload shapes (ResumeAdvicePayload,
 * CoverLetterPayload) so the frontend can use one result component per tool type.
 *
 * Truthfulness guardrails are non-negotiable:
 *   - No invented experience, metrics, employers, titles, or dates
 *   - Suggestions are directional — they tell the user what to do, not what to claim
 *   - Cover letter evidence must come from the actual resume text
 */

import { AppError }          from "../../errors/app-error.js";
import { getOpenAIClient, AI_MODELS } from "./openai.js";
import { throwIfAborted }    from "../../lib/request-abort.js";
import {
  ResumeAdviceJsonObject,
  CoverLetterJsonObject,
  normalizeResumeAdvice,
  normalizeCoverLetter,
  type ResumeAdvicePayload,
  type CoverLetterPayload,
} from "./document-tools.dto.js";


// ─── Token budgets ────────────────────────────────────────────────────────────

const RESUME_ADVICE_MAX_TOKENS  = 4_000;
const COVER_LETTER_MAX_TOKENS   = 5_000;


// ─── Input types ─────────────────────────────────────────────────────────────

export type GenericResumeAdviceInput = {
  candidateText:      string;
  targetField?:       string;
  targetRolesText?:   string;
  targetKeywords?:    string;
  additionalContext?: string;
  signal?:            AbortSignal;
};

export type TargetedResumeAdviceInput = {
  candidateText: string;
  jdText:        string;
  signal?:       AbortSignal;
};

export type GenericCoverLetterInput = {
  candidateText:      string;
  targetField?:       string;
  targetRolesText?:   string;
  targetCompany?:     string;
  whyInterested?:     string;
  templateText?:      string;
  additionalContext?: string;
  signal?:            AbortSignal;
};

export type TargetedCoverLetterInput = {
  candidateText: string;
  jdText:        string;
  templateText?: string;
  signal?:       AbortSignal;
};


// ─── Generic Resume Advice ────────────────────────────────────────────────────

/**
 * Generates resume advice based on the user's base resume and targeting context.
 * No job-specific JD — advice is general improvement guidance for the stated
 * direction.
 */
export async function buildGenericResumeAdvice(
  input: GenericResumeAdviceInput
): Promise<ResumeAdvicePayload> {
  const { candidateText, targetField, targetRolesText, targetKeywords, additionalContext, signal } = input;

  if (!candidateText?.trim()) {
    throw new AppError("Resume text is required.", 400, "RESUME_TEXT_MISSING");
  }

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const userPrompt = buildGenericResumeUserPrompt({
    candidateText, targetField, targetRolesText, targetKeywords, additionalContext,
  });

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.RESUME_ADVICE,
      input: [
        { role: "system", content: buildResumeAdviceSystemPrompt() },
        { role: "user",   content: userPrompt },
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "resume_advice",
          strict: true,
          schema: ResumeAdviceJsonObject,
        },
      },
      reasoning:         { effort: "medium" },
      max_output_tokens: RESUME_ADVICE_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseDocumentToolResponse<ResumeAdvicePayload>(resp, "resume_advice_generic");
  return normalizeResumeAdvice(parsed);
}


// ─── Targeted Resume Advice ───────────────────────────────────────────────────

/**
 * Generates resume advice tailored to a specific job application.
 * Uses both the candidate's resume and the job description.
 */
export async function buildTargetedResumeAdvice(
  input: TargetedResumeAdviceInput
): Promise<ResumeAdvicePayload> {
  const { candidateText, jdText, signal } = input;

  if (!candidateText?.trim()) throw new AppError("Resume text is required.", 400, "RESUME_TEXT_MISSING");
  if (!jdText?.trim())        throw new AppError("Job description is required.", 400, "JOB_DESCRIPTION_MISSING");

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.RESUME_ADVICE,
      input: [
        { role: "system", content: buildResumeAdviceSystemPrompt() },
        { role: "user",   content: buildTargetedResumeUserPrompt({ candidateText, jdText }) },
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "resume_advice_targeted",
          strict: true,
          schema: ResumeAdviceJsonObject,
        },
      },
      reasoning:         { effort: "medium" },
      max_output_tokens: RESUME_ADVICE_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseDocumentToolResponse<ResumeAdvicePayload>(resp, "resume_advice_targeted");
  return normalizeResumeAdvice(parsed);
}


// ─── Generic Cover Letter ─────────────────────────────────────────────────────

/**
 * Generates a reusable cover letter draft using the user's base resume
 * and targeting context. No specific job JD.
 */
export async function buildGenericCoverLetter(
  input: GenericCoverLetterInput
): Promise<CoverLetterPayload> {
  const {
    candidateText, targetField, targetRolesText, targetCompany,
    whyInterested, templateText, additionalContext, signal,
  } = input;

  if (!candidateText?.trim()) throw new AppError("Resume text is required.", 400, "RESUME_TEXT_MISSING");

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.COVER_LETTER,
      input: [
        { role: "system", content: buildCoverLetterSystemPrompt() },
        { role: "user",   content: buildGenericCoverLetterUserPrompt({
          candidateText, targetField, targetRolesText, targetCompany,
          whyInterested, templateText, additionalContext,
        })},
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "cover_letter_generic",
          strict: true,
          schema: CoverLetterJsonObject,
        },
      },
      reasoning:         { effort: "medium" },
      max_output_tokens: COVER_LETTER_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseDocumentToolResponse<CoverLetterPayload>(resp, "cover_letter_generic");
  return normalizeCoverLetter(parsed);
}


// ─── Targeted Cover Letter ────────────────────────────────────────────────────

/**
 * Generates a cover letter draft tailored to a specific job application.
 * Uses both the candidate's resume and the job description.
 * Optionally accepts a template to match the user's preferred structure/tone.
 */
export async function buildTargetedCoverLetter(
  input: TargetedCoverLetterInput
): Promise<CoverLetterPayload> {
  const { candidateText, jdText, templateText, signal } = input;

  if (!candidateText?.trim()) throw new AppError("Resume text is required.", 400, "RESUME_TEXT_MISSING");
  if (!jdText?.trim())        throw new AppError("Job description is required.", 400, "JOB_DESCRIPTION_MISSING");

  throwIfAborted(signal);

  const openai = getOpenAIClient();

  const resp = await openai.responses.create(
    {
      model: AI_MODELS.COVER_LETTER,
      input: [
        { role: "system", content: buildCoverLetterSystemPrompt() },
        { role: "user",   content: buildTargetedCoverLetterUserPrompt({ candidateText, jdText, templateText }) },
      ],
      text: {
        format: {
          type:   "json_schema",
          name:   "cover_letter_targeted",
          strict: true,
          schema: CoverLetterJsonObject,
        },
      },
      reasoning:         { effort: "medium" },
      max_output_tokens: COVER_LETTER_MAX_TOKENS,
    },
    { signal }
  );

  const parsed = parseDocumentToolResponse<CoverLetterPayload>(resp, "cover_letter_targeted");
  return normalizeCoverLetter(parsed);
}


// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildResumeAdviceSystemPrompt(): string {
  return [
    "You are a professional resume coach giving honest, actionable advice.",
    "Return ONLY valid JSON matching the provided schema. No markdown. No commentary.",
    "",
    "TRUTHFULNESS RULES (non-negotiable):",
    "- Do NOT invent experience, metrics, employers, projects, titles, or dates.",
    "- Only reference things explicitly stated in the candidate's resume text.",
    "- Suggestions must be DIRECTIONAL: tell the candidate what to do or add, not what to claim.",
    "  Wrong: 'Add that you reduced load times by 40%'",
    "  Right:  'If you have performance metrics, quantify them (e.g. load time reduction, req/s)'",
    "- If you cannot make a specific suggestion from the evidence, say so honestly.",
    "",
    "OUTPUT RULES:",
    "- summary: 2–3 sentences. Overall honest assessment of the resume's current state.",
    "- strengths: up to 6 items. What is genuinely working well that the candidate should lean into.",
    "- improvements: up to 6 items. Highest-priority gaps or weaknesses to address.",
    "- tailoring: up to 6 items. How to better align the resume with the stated target direction.",
    "  (For targeted runs: align with the specific JD. For generic: align with stated field/roles.)",
    "- rewrites: up to 6 items. Specific directional suggestions for bullet points or sections.",
    "  Each rewrite must reference actual resume content — do not invent new content.",
    "- keywords: up to 12 items. Keywords/concepts worth covering naturally given the target context.",
    "  Only suggest keywords that are plausibly evidenced by the candidate's actual experience.",
  ].join("\n");
}

function buildGenericResumeUserPrompt(args: {
  candidateText:      string;
  targetField?:       string;
  targetRolesText?:   string;
  targetKeywords?:    string;
  additionalContext?: string;
}): string {
  const lines = ["RESUME TEXT:", args.candidateText.trim(), ""];

  if (args.targetField)       lines.push(`TARGET FIELD: ${args.targetField.trim()}`);
  if (args.targetRolesText)   lines.push(`TARGET ROLES: ${args.targetRolesText.trim()}`);
  if (args.targetKeywords)    lines.push(`TARGET KEYWORDS: ${args.targetKeywords.trim()}`);
  if (args.additionalContext) lines.push(`ADDITIONAL CONTEXT: ${args.additionalContext.trim()}`);

  lines.push("", "Generate resume advice for this candidate based on the above.");
  return lines.join("\n");
}

function buildTargetedResumeUserPrompt(args: {
  candidateText: string;
  jdText:        string;
}): string {
  return [
    "RESUME TEXT:",
    args.candidateText.trim(),
    "",
    "JOB DESCRIPTION:",
    args.jdText.trim(),
    "",
    "Generate targeted resume advice to help this candidate better align their resume with this specific job.",
  ].join("\n");
}

function buildCoverLetterSystemPrompt(): string {
  return [
    "You are a professional career coach writing cover letters.",
    "Return ONLY valid JSON matching the provided schema. No markdown. No commentary.",
    "",
    "TRUTHFULNESS RULES (non-negotiable):",
    "- Do NOT invent experience, metrics, employers, projects, titles, dates, or facts.",
    "- The draft must be grounded in the candidate's actual resume text.",
    "- Do NOT make up facts about the target company unless they are explicitly stated.",
    "- Do NOT write fake enthusiasm or invented company knowledge.",
    "- If specific company details are missing, use tasteful placeholders (e.g. [Company Name]).",
    "- Evidence bullets must reference real resume content — not invented achievements.",
    "",
    "OUTPUT RULES:",
    "- summary: 1–2 sentences describing what was generated and any key assumptions made.",
    "- draft: the complete cover letter text, professional and readable.",
    "  * Opening: who you are and why you're interested.",
    "  * Body: 2–3 paragraphs connecting real experience to the role.",
    "  * Closing: call to action.",
    "  * Use placeholders like [Company Name], [Hiring Manager Name], [Date] where needed.",
    "  * If a template was provided, match its structure and tone.",
    "- evidence: up to 8 items. Key resume points used as evidence in the draft.",
    "- notes: up to 6 items. Customization tips — what to adjust, personalize, or verify.",
    "- placeholders: list every placeholder used in the draft so the user knows what to fill in.",
  ].join("\n");
}

function buildGenericCoverLetterUserPrompt(args: {
  candidateText:      string;
  targetField?:       string;
  targetRolesText?:   string;
  targetCompany?:     string;
  whyInterested?:     string;
  templateText?:      string;
  additionalContext?: string;
}): string {
  const lines = ["RESUME TEXT:", args.candidateText.trim(), ""];

  if (args.targetField)       lines.push(`TARGET FIELD: ${args.targetField.trim()}`);
  if (args.targetRolesText)   lines.push(`TARGET ROLES: ${args.targetRolesText.trim()}`);
  if (args.targetCompany)     lines.push(`TARGET COMPANY: ${args.targetCompany.trim()}`);
  if (args.whyInterested)     lines.push(`WHY INTERESTED: ${args.whyInterested.trim()}`);
  if (args.additionalContext) lines.push(`ADDITIONAL CONTEXT: ${args.additionalContext.trim()}`);
  if (args.templateText)      lines.push("", "TEMPLATE TO FOLLOW:", args.templateText.trim());

  lines.push("", "Generate a professional cover letter draft for this candidate.");
  return lines.join("\n");
}

function buildTargetedCoverLetterUserPrompt(args: {
  candidateText: string;
  jdText:        string;
  templateText?: string;
}): string {
  const lines = [
    "RESUME TEXT:",
    args.candidateText.trim(),
    "",
    "JOB DESCRIPTION:",
    args.jdText.trim(),
  ];

  if (args.templateText) {
    lines.push("", "TEMPLATE TO FOLLOW:", args.templateText.trim());
  }

  lines.push("", "Generate a targeted cover letter for this specific role.");
  return lines.join("\n");
}


// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Minimal response parser for document tool calls.
 * Logs token usage, checks completion status, extracts and parses JSON.
 */
function parseDocumentToolResponse<T>(resp: any, tag: string): T {
  const usage = {
    input:  resp?.usage?.input_tokens  ?? resp?.usage?.prompt_tokens     ?? 0,
    output: resp?.usage?.output_tokens ?? resp?.usage?.completion_tokens  ?? 0,
  };

  console.log(JSON.stringify({
    msg:    "[ai.usage]",
    tag,
    id:     resp?.id    ?? null,
    model:  resp?.model ?? null,
    status: resp?.status ?? null,
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
    // Strip ```json fences if present
    const clean = outputText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
    return JSON.parse(clean) as T;
  } catch {
    throw new AppError("AI returned invalid JSON.", 502, "AI_INVALID_JSON");
  }
}