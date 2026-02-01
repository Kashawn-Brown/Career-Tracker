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

// Get the OpenAI model.
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}

// Get the OpenAI model for JD extraction. (uses gpt-4o-mini model)
export function getJdExtractOpenAIModel(): string {
  return process.env.OPENAI_MODEL_JD_EXTRACT?.trim() || "gpt-4o-mini";
}
