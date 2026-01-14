import OpenAI from "openai";

/**
 * Centralized OpenAI client.
 * Keeps config + defaults in one place so routes/services stay clean.
 */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fail fast in a predictable way (easier to debug than silent 500s later)
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}
