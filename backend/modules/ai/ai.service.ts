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
// export async function buildFitV1(jdText: string, candidateText: string): Promise<FitV1Response> {
//   const jd = (jdText ?? "").trim();
//   const candidate = (candidateText ?? "").trim();

//   if (!jd) throw new AppError("Job description is missing.", 400);
//   if (!candidate) throw new AppError("Candidate history is missing.", 400);


//   const openai = getOpenAIClient();
//   const model = getOpenAIModel();

//   const resp = await openai.responses.create({
//     model,
//     input: [
//       { role: "system", content: buildFitSystemPrompt() },
//       { role: "user", content: buildFitUserPrompt(jd, candidate) },
//     ],
//     text: {
//       format: {
//         type: "json_schema",
//         name: "fit_v1",
//         strict: true,
//         schema: FitV1JsonObject,
//       },
//     },
//     // Keep output bounded
//     max_output_tokens: 2500,
//   });

//   const parsed = safeJsonParse<FitV1Response>(resp.output_text);
//   return normalizeFitV1Response(parsed);
// }

// buildFitV1 with logging context
export async function buildFitV1(
  jdText: string,
  candidateText: string,
  ctx: AiLogCtx = {}
): Promise<FitV1Response> {
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
    max_output_tokens: 2500,
  });

  const extracted = extractResponseText(resp);

  // If the API returned a refusal (or non-text output), log what happened.
  if (extracted.refusal) {
    ctx.log?.warn(
      {
        reqId: ctx.reqId,
        ...summarizeResponse(resp),
        refusal: summarizeText(extracted.refusal, 240),
      },
      "[ai.fit] model refusal"
    );
    throw new AppError("AI refused the request.", 502);
  }

  // If we got no text at all, log the full response shape.
  if (!extracted.text.trim()) {
    ctx.log?.warn(
      { reqId: ctx.reqId, ...summarizeResponse(resp) },
      "[ai.fit] empty output text"
    );
    throw new AppError("AI returned empty output.", 502);
  }

  // Parse + if invalid, log a snippet of the raw model output.
  try {
    const parsed = safeJsonParse<FitV1Response>(extracted.text);
    return normalizeFitV1Response(parsed);
  } catch (err) {
    ctx.log?.warn(
      {
        reqId: ctx.reqId,
        ...summarizeResponse(resp),
        text: summarizeText(extracted.text, 320),
      },
      "[ai.fit] invalid JSON from model"
    );
    throw err;
  }
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
    "You evaluate candidate-to-job fit using ONLY the provided job description and candidate history text.",
    "Return ONLY JSON matching the provided schema. No markdown. No extra keys.",
    "",
    "Truthfulness rules:",
    "- Only claim a skill/experience if it is explicitly stated in the candidate text.",
    "- If something seems likely but is NOT explicit, you MAY mention it only as 'Inferred (not explicit): ...' and you MUST NOT use it to justify a higher score or 'high' confidence.",
    "- Do not copy long phrases from the JD; paraphrase. Evidence snippets must be short (<= 12 words).",
    "",
    "Scoring rubric (0–100):",
    "- 90–100: clear evidence of most must-haves + strong directly relevant experience.",
    "- 70–89: good match but some must-haves unclear/missing.",
    "- 40–69: partial match; several key gaps.",
    "- 0–39: weak match; major requirements not evidenced.",
    "Confidence:",
    "- high only when the texts clearly support the score; medium when key items are unclear; low when evidence is thin.",
    "",
    "Output constraints (keep it tight and non-redundant):",
    "- strengths: 5–7 items. strengths[0] MUST be a 1–2 sentence overall fit summary.",
    "  Each remaining item format: '<match> — Evidence: <candidate snippet> — Why: <why it matters>' (max 2 sentences).",
    "- gaps: 5–7 items. gaps[0] MUST be a 1–2 sentence summary of the biggest blockers / what would raise the score most.",
    "  Each remaining item format: '<gap> — Impact: <why> — Fast path: <quick action>' (max 2 sentences).",
    "- keywordGaps: 8–12 UNIQUE items. Include missing tools/tech AND derived concepts when relevant.",
    "  Prefer (1) tools/tech/platforms, then (2) architecture/process concepts. Mark inferred items as 'Inferred (not explicit): ...'.",
    "- recommendedEdits: 5–7 items. Must be grounded in candidate text; do not invent metrics. Format: '<edit> — Why: <reason>'.",
    "- questionsToAsk: up to 5 questions the CANDIDATE should ask the EMPLOYER (not questions asked to the candidate).",
    "  Focus on clarifying gaps, expectations, success criteria, stack, and what strong performance looks like.",
    "",
    "Avoid repetition across fields. If something appears as a gap, don't restate it as a keyword gap unless the keyword adds specificity.",
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



// -------------- HELPER FUNCTIONS FOR LOGGING --------------

type AiLogCtx = { log?: FastifyBaseLogger; reqId?: string };

function summarizeText(text: string, snippetLen = 240) {
  const t = String(text ?? "");
  const head = t.slice(0, snippetLen);
  const tail = t.length > snippetLen ? t.slice(-snippetLen) : "";
  return {
    len: t.length,
    hasFence: t.includes("```"),
    firstChar: t[0] ?? "",
    lastChar: t[t.length - 1] ?? "",
    head,
    tail,
  };
}

function summarizeResponse(resp: any) {
  const output = Array.isArray(resp?.output) ? resp.output : [];
  return {
    responseId: resp?.id,
    model: resp?.model,
    outputTextLen: typeof resp?.output_text === "string" ? resp.output_text.length : null,
    outputItems: output.map((item: any) => ({
      type: item?.type,
      contentTypes: Array.isArray(item?.content) ? item.content.map((c: any) => c?.type) : [],
    })),
    usage: resp?.usage, // helpful for token/cost debugging
  };
}

/**
 * Prefer resp.output_text, but fall back to scanning resp.output for content items.
 * Also detect refusal content when present.
 */
function extractResponseText(resp: any): { text: string; refusal?: string } {
  const direct = typeof resp?.output_text === "string" ? resp.output_text : "";
  if (direct.trim()) return { text: direct };

  const output = Array.isArray(resp?.output) ? resp.output : [];
  let text = "";
  let refusal = "";

  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) continue;

    for (const c of item.content) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c?.text === "string") {
        text += c.text;
      }
      if (c?.type === "refusal" && typeof c?.refusal === "string") {
        refusal += c.refusal;
      }
    }
  }

  return { text, refusal: refusal || undefined };
}
