import { getOpenAIClient, getOpenAIModel } from "./ai.openai.js";

export async function pingOpenAI(): Promise<{ model: string }> {
  // Simple smoke helper; not a route yet.
  // Useful for local quick checks if needed later.
  const model = getOpenAIModel();
  getOpenAIClient(); // ensures key exists
  return { model };
}
