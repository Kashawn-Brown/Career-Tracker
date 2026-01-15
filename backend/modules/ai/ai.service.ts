import { AppError } from "../../errors/app-error.js";
import { getOpenAIClient, getOpenAIModel } from "./openai.js";
import {
  ApplicationFromJdJsonObject,
  normalizeApplicationFromJdResponse,
  type ApplicationFromJdResponse,
} from "./ai.dto.js";

/**
 * Service layer for the AI module:
 * - Keep OpenAI usage out of the HTTP route handlers
 * - Enforces user scoping + basic normalization
 */

/**
 * Turns pasted JD text into an application draft response.
 * No DB writes.
 */
export async function buildApplicationDraftFromJd(jdText: string): Promise<ApplicationFromJdResponse> {
  
  // Get the OpenAI client and model.
  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  try {
    // Make the OpenAI request.
    const resp = await openai.responses.create({
      model,
      input: [
        { role: "system", content: buildSystemPrompt() }, // The system prompt.
        { role: "user", content: jdText }, // The pasted JD text.
      ],
      text: {
        format: {
          type: "json_schema",
          name: "application_from_jd_v1",
          strict: true,
          schema: ApplicationFromJdJsonObject,
        },
      },
      // Guardrail: keep output bounded (cost + response size)
      max_output_tokens: 900,
    });

    const outputText = resp.output_text;

    const parsed = safeJsonParse<ApplicationFromJdResponse>(outputText);
    return normalizeApplicationFromJdResponse(parsed);
  } catch (err) {
    // Treat OpenAI failures as a dependency error (not a user input error)
    throw new AppError("AI request failed", 502);
  }
}







// ------------ HELPER FUNCTIONS ------------

/**
 * Build the system prompt for the AI request.
 */
function buildSystemPrompt(): string {
  return [
    "You extract structured fields from a pasted job description.",
    "Return ONLY JSON matching the provided schema.",
    "",
    "Rules:",
    "- If a field is not clearly present, omit it (do NOT guess).",
    "- Prefer omitting workMode/jobType rather than using UNKNOWN.",
    "- noteworthyNotes: short, concrete bullets (stack, seniority, responsibilities, must-haves, work policy, visa, etc.).",
    "- warnings: missing/unclear critical info (company unclear, location unclear, etc.).",
  ].join("\n");
}

/**
 * Parse a JSON string safely.
 */
function safeJsonParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // This should be rare because we're using strict json_schema output,
    // but it keeps errors predictable if the dependency misbehaves.
    throw new AppError("AI returned invalid JSON", 502);
  }
}
