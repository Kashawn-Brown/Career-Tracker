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

  // try {
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
    // console.log("HERE IS THE OUTPUT (PRE-NORMALIZATION):", parsed);

    return normalizeApplicationFromJdResponse(parsed);
  // } catch (err) {
    // Treat OpenAI failures as a dependency error (not a user input error)
    // throw new AppError("AI request failed", 502);
  // }
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
    "- Do NOT invent details (e.g., hybrid days, contract length) unless explicitly stated.",
    "- jdSummary: 2–4 sentences in your own words. Must cover: (1) what the role does (key responsibilities), (2) key stack/tools if present, (3) must-have requirements if present, (4) location/work arrangement if present. Do NOT just copy sentences from the JD.",
    "- notes: 5–10 short bullets spanning responsibilities, stack/tools, requirements, and any constraints (visa, schedule, on-call, etc.). Avoid repeating jdSummary.",
    "Field semantics (do NOT mix these):",
    "- location = a geographic place only (country/city/region). Never use 'Remote/Hybrid/Onsite' as location.",
    "- workMode = ENUMS: workMode must be exactly 'REMOTE' | 'HYBRID' | 'ONSITE' (uppercase) or omitted. (ONLY if explicitly stated; must be EXACT uppercase enum).",
    "- locationDetails = geographic constraints/alternatives/specifics ONLY (e.g. '1235 Main St.', 'Open to 5 locations within Canada', 'Toronto or Montreal', 'Must reside in Ontario', time zone). Do NOT put days/week or schedule here (e.g. DO NOT put 'Hybrid — 2 days/week in office'). Omit and leave blank if no LOCATION info (DO NOT PUT INFO ABOUT HYBRID WORK, ETC. INTO LOCATIONDETAILS).",
    "- workModeDetails = schedule/cadence expectations: days onsite, cadence, flexibility, etc. (e.g. 'Hybrid: 3 days/week in office', 'Remote-first with quarterly onsite'). If not stated, omit.",
    "- jobTypeDetails = extra job type constraints ONLY if stated (contract length, hours, shift, on-call, travel). If not stated, omit.",
    "",
    "Tags:",
    "- tagsText: 5–10 short keyword tags inferred ONLY from explicit JD text (stack, domain, constraints). Examples: 'Node.js, TypeScript, Fastify, PostgreSQL, Prisma, JWT, CI/CD, GCP, Remote, Redis, Observability'.",
    "- Do not invent tags for tools/tech not mentioned.",
    "",
    "Warnings:",
    "- return [] unless (a) critical info is missing/unclear OR (b) the JD states an explicit constraint/disqualifier (no visa sponsorship, must be enrolled, must graduate after X, citizenship/clearance required, location eligibility constraints, etc.).",
    "- If a constraint/disqualifier is present, add it as a warning string (e.g., 'No visa sponsorship').",
    "- If a constraint/disqualifier is present, include add the end of notes too as a bullet starting with 'Constraint: ...'.",

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
