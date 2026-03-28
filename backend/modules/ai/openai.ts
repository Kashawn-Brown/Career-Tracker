import OpenAI from "openai";
import { AppError } from "../../errors/app-error.js";

/**
 * Centralized OpenAI client.
 * Keeps config + defaults in one place so routes/services stay clean.
 */

let client: OpenAI | null = null;

// Get the OpenAI client.
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Fail fast in a predictable way
  if (!apiKey) throw new AppError("OPENAI_API_KEY is missing", 500, "OPENAI_API_KEY_MISSING");

  // Singleton so  client is only created once.
  if (!client) client = new OpenAI({ apiKey });

  return client;
}

/**
 * Model used for FIT_V1 generation.
 * Override via OPENAI_MODEL_FIT env var.
 */
export function getFitOpenAIModel(): string {
  return process.env.OPENAI_MODEL_FIT ?? "o4-mini";
}

/**
 * Model used for JD extraction (JD_EXTRACT_V1).
 * Defaults to gpt-5-mini — fast and cost-effective for structured extraction.
 * Override via OPENAI_MODEL_JD_EXTRACT env var.
 */
export function getJdExtractOpenAIModel(): string {
  return process.env.OPENAI_MODEL_JD_EXTRACT ?? "gpt-5-mini";
}
