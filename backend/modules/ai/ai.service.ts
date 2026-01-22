import { AppError } from "../../errors/app-error.js";
import { getOpenAIClient, getOpenAIModel, getJdExtractOpenAIModel } from "./openai.js";
import { ApplicationFromJdJsonObject, normalizeApplicationFromJdResponse, FitV1JsonObject, normalizeFitV1Response } from "./ai.dto.js";
import type { ApplicationFromJdResponse, FitV1Response } from "./ai.dto.js";
import type { FastifyBaseLogger } from "fastify";


/**
 * Service layer for the AI module:
 * - Keep OpenAI usage out of the HTTP route handlers
 * - Enforces user scoping + basic normalization
 */

/**
 * JD_EXTRACT_V1: Turns pasted JD text into an application draft response.
 * 
 * No DB writes.
 */
export async function buildApplicationDraftFromJd(jdText: string): Promise<ApplicationFromJdResponse> {
  
  // Get the OpenAI client and model.
  const openai = getOpenAIClient();
  const model = getJdExtractOpenAIModel();

  // try {
    // Make the OpenAI request.
    const resp = await openai.responses.create({
      model,
      input: [
        { role: "system", content: buildExtractJdSystemPrompt() }, // The system prompt.
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


/**
 * Generates FIT_V1 using canonical JD text + extracted candidate-history text.
 * No DB writes.
 */
export async function buildFitV1(jdText: string, candidateText: string): Promise<FitV1Response> {
  const jd = (jdText ?? "").trim();
  const candidate = (candidateText ?? "").trim();

  if (!jd) throw new AppError("Job description is missing.", 400);
  if (!candidate) throw new AppError("Candidate history is missing.", 400);


  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  const resp = await openai.responses.create({
    model,
    input: [
      { role: "system", content: buildFitSystemPrompt() },
      { role: "user", content: buildFitUserPrompt(jd, candidate) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "fit_v1",
        strict: true,
        schema: FitV1JsonObject,
      },
    },
    // Keep output bounded
    max_output_tokens: 2500,
  });

  // Get the token usage
  const usage = getTokenUsage(resp);

  // Always log usage (cheap + super useful). Cloud Run will capture console.* logs.
  console.info("[ai.usage] fit_v1", {
    model: resp?.model ?? null,
    status: resp?.status ?? null,
    incompleteReason: resp?.incomplete_details?.reason ?? null,
    inputTokens: usage.input,
    outputTokens: usage.output,
    totalTokens: usage.total,
  });


  // Get the debug information
  const debug = classifyOpenAIResponse(resp);
  const outputText = (resp.output_text ?? "").trim();
  const refusal = extractRefusalText(resp);
  const anyText = extractAnyTextPreview(resp);

  const jdLen = jd.length;
  const candidateLen = candidate.length;

  const shouldDebugLog = process.env.AI_DEBUG === "true" || !outputText || debug.status !== "completed";
  if (shouldDebugLog) {
    console.warn("[ai.fit] response", {
      jdLen: jd.length,
      candidateLen: candidate.length,
      ...debug,
      refusalPreview: refusal ? redactSample(refusal.slice(0, 300)) : null,
      anyTextPreview: anyText ? redactSample(anyText.slice(0, 300)) : null,
      outputHead: outputText ? redactSample(outputText.slice(0, 300)) : null,
      outputTail: outputText ? redactSample(outputText.slice(-300)) : null,
    });
  }

  // Hard fail early with the REAL reason (this is what you need)
  if (debug.status !== "completed") {
    throw new AppError(
      refusal
        ? `AI refused the request (status=${debug.status}).`
        : `AI did not complete (status=${debug.status}, reason=${debug.incompleteReason ?? "unknown"}, tokens=${usage.total} [in=${usage.input}, out=${usage.output}]).`,
      502
    );
  }

  // If output_text is empty, classify it now (don’t let safeJsonParse hide the reason)
  if (!outputText) {
    throw new AppError(
      refusal
        ? "AI refused the request (completed but refusal/empty output)."
        : "AI completed but returned empty output_text.",
      502
    );
  }

  const parsed = safeJsonParse<FitV1Response>(outputText);
  return normalizeFitV1Response(parsed);
}



// ------------ HELPER FUNCTIONS ------------

/**
 * Build the system prompt for the AI request to extract the job description.
 */
function buildExtractJdSystemPrompt(): string {
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
    "- salaryText = must be only the base pay numeric amount/range with currency (e.g., CAD $80k-$120k); exclude any extra words and exclude bonus/equity/benefits (if important: put those in notes instead)",
    "",
    "Tags:",
    "- tagsText: 5–10 short keyword tags inferred ONLY from explicit JD text (stack, domain, constraints). Examples: 'Node.js, TypeScript, Fastify, PostgreSQL, Prisma, JWT, CI/CD, GCP, Remote, Redis, Observability'.",
    "- Do not invent tags for tools/tech not mentioned.",
    "",
    "Warnings:",
    "- return [] unless (a) critical info is missing/unclear OR (b) the JD states an explicit constraint/disqualifier (no visa sponsorship, must be enrolled, must graduate after X, citizenship/clearance required, location eligibility constraints, etc.).",
    "- If a constraint/disqualifier is present, add it as a warning string (e.g., 'No visa sponsorship').",
    "- If a constraint/disqualifier is present, include add the end of notes too as a bullet starting with 'Constraint: Requires/Restrictions/Disqualifiers etc. ...'.",

  ].join("\n");
}

/**
 * Build the system prompt for the AI request to evaluate the candidate-to-job fit.
 * 
 * buildFitSystemPrompt() is used to build the system prompt for the AI request with the instructions for the AI on how to evaluate the fit.
 * 
 * buildFitUserPrompt() is used to build the user prompt for the AI request with the job description and candidate history text.
 */
function buildFitSystemPrompt(): string {
  return [
    "You are generating an informational candidate-to-job fit summary for the candidate (NOT a hiring decision).",
    "Evaluate fit using ONLY the provided job description and candidate history text.",
    "Return ONLY JSON matching the provided schema. No markdown. No extra keys.",
    "",
    "Safety + privacy rules:",
    "- Do NOT use or mention protected traits (age, race, gender, religion, disability, etc.), even if present in the text.",
    "- Do NOT output any personal contact info or identifiers (email, phone, address, links). If a snippet contains any, redact it as '[REDACTED]'.",
    "- Keep evidence snippets short (<= 12 words) and only from candidate text. Never quote the JD verbatim.",
    "",
    "Truthfulness rules:",
    "- Only claim a skill/experience if it is explicitly stated in the candidate text.",
    "- If something seems likely but is NOT explicit, you MAY mention it only as 'Inferred (not explicit): ...' and you MUST NOT use it to justify a higher score or 'high' confidence.",
    "- Do not invent requirements not present in the JD.",
    "",
    "Scoring rubric (0–100):",
    "- 90–100: clear evidence of most must-haves + strong directly relevant experience.",
    "- 70–89: good match but some must-haves unclear/missing.",
    "- 40–69: partial match; several key gaps.",
    "- 0–39: weak match; major requirements not evidenced.",
    "Confidence:",
    "- high only when the texts clearly support the score; medium when key items are unclear; low when evidence is thin.",
    "",
    "Output constraints (tight + non-redundant):",
    "- strengths: 5–7 items. strengths[0] MUST be a 1–2 sentence overall fit summary (skills-based, no protected traits).",
    "  Each remaining item format: '<match> — Evidence: <candidate snippet> — Why: <why it matters>' (max 2 sentences).",
    "- gaps: 5–7 items. gaps[0] MUST be a 1–2 sentence summary of biggest blockers / what would raise the score most.",
    "  Each remaining item format: '<gap> — Impact: <why> — Fast path: <quick action>' (max 2 sentences).",
    "- keywordGaps: 8–12 UNIQUE items. Include missing tools/tech AND derived concepts when relevant.",
    "  Prefer (1) tools/tech/platforms, then (2) architecture/process concepts. Mark inferred items as 'Inferred (not explicit): ...'.",
    "- recommendedEdits: 5–7 items. Must be grounded in candidate text; do not invent metrics. Format: '<edit> — Why: <reason>'.",
    "- questionsToAsk: up to 5 questions the CANDIDATE should ask the EMPLOYER (not questions asked to the candidate).",
    "  Focus on clarifying gaps, expectations, success criteria, stack, and what strong performance looks like.",
    "",
    "Avoid repetition across fields. If something appears as a gap, don't restate it as a keyword gap unless the keyword adds specificity.",
    "",
    "If you cannot comply for any reason, still return valid JSON with:",
    "- score: 0, confidence: 'low', and strengths[0]/gaps[0] explaining that the output could not be generated from the provided text.",
  ].join("\n");
}


function buildFitUserPrompt(jdText: string, candidateText: string): string {
  return [
    "JOB DESCRIPTION (canonical):",
    jdText,
    "",
    "CANDIDATE HISTORY (extracted):",
    candidateText,
  ].join("\n");
}


/**
 * Parse a JSON string safely.
 */
function redactSample(s: string) {
  // Redact letters/numbers to avoid leaking content in logs while keeping JSON structure visible
  return s.replace(/[A-Za-z0-9]/g, "x");
}

function stripJsonFences(text: string) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m?.[1] ?? text).trim();
}

function tryExtractJsonSubstring(text: string) {
  const t = text.trim();

  // Prefer object extraction
  const objStart = t.indexOf("{");
  const objEnd = t.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    return t.slice(objStart, objEnd + 1);
  }

  // Fallback: array extraction
  const arrStart = t.indexOf("[");
  const arrEnd = t.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    return t.slice(arrStart, arrEnd + 1);
  }

  return null;
}

function safeJsonParse<T>(raw: string | null | undefined): T {
  const original = (raw ?? "").trim();

  if (!original) {
    console.warn("[ai] safeJsonParse: empty output_text");
    throw new AppError("AI returned invalid JSON", 502);
  }

  // 1) Strip ```json fences if the model included them
  const unfenced = stripJsonFences(original);

  // 2) First parse attempt
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    // continue
  }

  // 3) Second attempt: extract the largest JSON-looking substring
  const extracted = tryExtractJsonSubstring(unfenced);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // continue
    }
  }

  // 4) Log redacted previews for debugging (structure only, no content)
  const head = redactSample(original.slice(0, 200));
  const tail = redactSample(original.slice(-200));

  console.warn("[ai] safeJsonParse failed", {
    len: original.length,
    hasFence: original.includes("```"),
    firstChar: original[0],
    lastChar: original[original.length - 1],
    head,
    tail,
  });

  throw new AppError("AI returned invalid JSON", 502);
}

function summarizeOpenAIResponseForDebug(resp: any) {
  const output = Array.isArray(resp?.output) ? resp.output : [];

  return {
    id: resp?.id,
    status: resp?.status,
    model: resp?.model,
    outputTextLen: typeof resp?.output_text === "string" ? resp.output_text.length : 0,
    incompleteDetails: resp?.incomplete_details ?? null,
    usage: resp?.usage ?? null,
    outputItems: output.map((item: any) => ({
      type: item?.type,
      role: item?.role,
      contentTypes: Array.isArray(item?.content) ? item.content.map((c: any) => c?.type).filter(Boolean) : [],
    })),
  };
}

function extractRefusalText(resp: any): string | null {
  const output = Array.isArray(resp?.output) ? resp.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.refusal === "string" && c.refusal.trim()) return c.refusal.trim();
      // Some shapes embed refusal as text under a refusal-type content item
      if (c?.type === "refusal" && typeof c?.text === "string" && c.text.trim()) return c.text.trim();
    }
  }
  return null;
}

function extractAnyTextPreview(resp: any): string | null {
  const output = Array.isArray(resp?.output) ? resp.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      // Most common: output_text items
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();

      // Some shapes: refusal items
      if (typeof c?.refusal === "string" && c.refusal.trim()) return c.refusal.trim();
    }
  }
  return null;
}

function classifyOpenAIResponse(resp: any) {
  const status = resp?.status ?? "unknown";
  const reason = resp?.incomplete_details?.reason ?? null;
  const error = resp?.error ?? null;

  const outputItems = Array.isArray(resp?.output) ? resp.output : [];
  const contentTypes = outputItems.flatMap((it: any) =>
    Array.isArray(it?.content) ? it.content.map((c: any) => c?.type).filter(Boolean) : []
  );

  return {
    id: resp?.id ?? null,
    model: resp?.model ?? null,
    status,
    incompleteReason: reason,
    incompleteDetails: resp?.incomplete_details ?? null,
    error,
    outputCount: outputItems.length,
    contentTypes,
    outputTextLen: typeof resp?.output_text === "string" ? resp.output_text.length : 0,
    usage: resp?.usage ?? null,
  };
}

function getTokenUsage(resp: any) {
  const u = resp?.usage ?? {};
  const input = u.input_tokens ?? u.prompt_tokens ?? 0;
  const output = u.output_tokens ?? u.completion_tokens ?? 0;
  const total = u.total_tokens ?? (input + output);
  return { input, output, total, raw: u };
}
