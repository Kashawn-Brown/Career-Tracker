import OpenAI from "openai";

/**
 * Centralized OpenAI client.
 * Keeps config + defaults in one place so routes/services stay clean.
 */

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Fail fast in a predictable way
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  // Singleton so  client is only created once.
  if (!client) client = new OpenAI({ apiKey });

  return client;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}
