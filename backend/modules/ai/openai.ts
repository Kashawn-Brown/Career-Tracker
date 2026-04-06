import OpenAI from "openai";
import { AppError } from "../../errors/app-error.js";

/**
 * Centralized OpenAI client and model configuration.
 *
 * ALL model names live here.
 * To change a model, change it here.
 *
 * Each entry follows the pattern:
 *   TASK_PLAN: env override ?? default model
 *
 * Env overrides let you swap models in production without a redeploy.
 */

// ─── OpenAI Client ────────────────────────────────────────────────────────────────

let client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client.
 * Fails fast with a clear error if OPENAI_API_KEY is missing.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError("OPENAI_API_KEY is missing", 500, "OPENAI_API_KEY_MISSING");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

/**
 * Model for JD extraction (JD_EXTRACT_V1).
 * Fast structured extraction — same model for all plans.
 */
export function getJdExtractOpenAIModel(): string {
  return AI_MODELS.JD_EXTRACT;
}

/**
 * Optional second model for JD extraction when the primary returns `content_filter`
 * (e.g. try `gpt-4o-mini`). Set `OPENAI_MODEL_JD_EXTRACT_FALLBACK` in the environment.
 */
export function getJdExtractFallbackOpenAIModel(): string | undefined {
  const m = process.env.OPENAI_MODEL_JD_EXTRACT_FALLBACK?.trim();
  return m || undefined;
}

// ─── Model registry ────────────────────────────────────────────────────────

export const AI_MODELS = {

  // JD extraction: structured field extraction from pasted job descriptions.
  // Same model for all plans — task is mechanical, no reasoning needed.
  JD_EXTRACT: process.env.OPENAI_MODEL_JD_EXTRACT ?? "gpt-5-mini",

  // FIT_V1: compatibility analysis between a candidate and a job description.
  // Higher plans get stronger models with more deliberate reasoning.
  FIT_REGULAR:  process.env.OPENAI_MODEL_FIT_REGULAR  ?? "gpt-5-mini",
  FIT_PRO:      process.env.OPENAI_MODEL_FIT_PRO      ?? "gpt-5-mini", // was gpt-5
  FIT_PRO_PLUS: process.env.OPENAI_MODEL_FIT_PRO_PLUS ?? "gpt-5-mini", // was gpt-5


  // Interview question generation: generate interview questions based on a job description and the user's resume.
  INTERVIEW_QUESTION_GENERATION: process.env.OPENAI_MODEL_INTERVIEW_QUESTION_GENERATION ?? "gpt-5-mini", // was gpt-5

  // Document tools: resume advice and cover letter generation.
  // Both generic and targeted variants share one model each.
  RESUME_ADVICE: process.env.OPENAI_MODEL_RESUME_ADVICE ?? "gpt-5-mini",
  COVER_LETTER:  process.env.OPENAI_MODEL_COVER_LETTER  ?? "gpt-5-mini",

} as const;