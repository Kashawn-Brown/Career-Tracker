import OpenAI from "openai";
import { AppError } from "../../errors/app-error.js";

/**
 * Centralized OpenAI client and model configuration.
 *
 * Phase 10 decision: one model for all tools and all plans.
 * Quality differentiation comes from effort/verbosity profiles, not model switching.
 *
 * Override the model at runtime via OPENAI_MODEL env var without a redeploy.
 */

// ─── OpenAI Client ────────────────────────────────────────────────────────────

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

// ─── Single model constant ────────────────────────────────────────────────────

/**
 * The model used for all AI tools across all plans.
 * Set OPENAI_MODEL in the environment to override without redeploying.
 */
export const OPENAI_MODEL: string =
  process.env.OPENAI_MODEL?.trim() ?? "gpt-5-mini";

/**
 * AI_MODELS is kept as a thin alias so existing call sites don't all need
 * updating at once. All entries resolve to OPENAI_MODEL.
 *
 * @deprecated Use OPENAI_MODEL directly in new code.
 */
export const AI_MODELS = {
  JD_EXTRACT:                    OPENAI_MODEL,
  FIT_REGULAR:                   OPENAI_MODEL,
  FIT_PRO:                       OPENAI_MODEL,
  FIT_PRO_PLUS:                  OPENAI_MODEL,
  RESUME_ADVICE:                 OPENAI_MODEL,
  COVER_LETTER:                  OPENAI_MODEL,
  INTERVIEW_PREP:                OPENAI_MODEL,
  INTERVIEW_QUESTION_GENERATION: OPENAI_MODEL,
} as const;

/**
 * Model for JD extraction. Kept for call-site compatibility.
 * JD extraction always uses the shared model with a fixed stable config.
 */
export function getJdExtractOpenAIModel(): string {
  return OPENAI_MODEL;
}

/**
 * Optional fallback model for JD extraction on content_filter responses.
 * Set OPENAI_MODEL_JD_EXTRACT_FALLBACK in the environment.
 */
export function getJdExtractFallbackOpenAIModel(): string | undefined {
  const m = process.env.OPENAI_MODEL_JD_EXTRACT_FALLBACK?.trim();
  return m || undefined;
}