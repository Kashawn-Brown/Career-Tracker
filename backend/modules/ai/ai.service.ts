import { AppError } from "../../errors/app-error.js";
import { getOpenAIClient, getJdExtractOpenAIModel } from "./openai.js";
import { ApplicationFromJdJsonObject, normalizeApplicationFromJdResponse, FitV1JsonObject, normalizeFitV1Response, getFitPolicyForTier, FitV1RunResult } from "./ai.dto.js";
import type { ApplicationFromJdResponse, FitV1Response } from "./ai.dto.js";
import { AiTier } from "./ai-tier.js";


// Output bounds (cost-control later)
const JD_EXTRACT_MAX_OUTPUT_TOKENS = 900;
const FIT_MAX_OUTPUT_TOKENS = 10000;



/**
 * Service layer for the AI module:
 * - Keep OpenAI usage out of the HTTP route handlers
 * - Enforces user scoping + basic normalization
 */

/**
 * JD_EXTRACT_V1: Turns pasted JD text into an application draft response.
 */
export async function buildApplicationDraftFromJd(jdText: string): Promise<ApplicationFromJdResponse> {
  
  // Get the OpenAI client and model.
  const openai = getOpenAIClient();
  const model = getJdExtractOpenAIModel();
  
    
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
    max_output_tokens: JD_EXTRACT_MAX_OUTPUT_TOKENS,
  });

  // Parse the output text into a JSON object
  const parsed = parseJsonSchemaOutputOrThrow<ApplicationFromJdResponse>(resp, {
    tag: "jd_extract_v1",
    meta: { jdLen: jdText.length },
  });

  // Return the normalized response
  return normalizeApplicationFromJdResponse(parsed);

}


/**
 *  FIT_V1: Generates a fit of compatibility between the candidate and the job description using the canonical JD text + extracted candidate-history text.
 */
export async function buildFitV1(jdText: string, candidateText: string, opts?: { tier?: AiTier }): Promise<FitV1RunResult> {
  const jd = (jdText ?? "").trim();
  const candidate = (candidateText ?? "").trim();

  // Validate inputs
  if (!jd) throw new AppError("Job description is missing.", 400, "JOB_DESCRIPTION_MISSING");
  if (!candidate) throw new AppError("Candidate history is missing.", 400, "CANDIDATE_HISTORY_MISSING");

  const tier: AiTier = opts?.tier ?? "regular";
  const policy = getFitPolicyForTier(tier);


  // Get the OpenAI client and model.
  const openai = getOpenAIClient();

  // Make the OpenAI request for the fit evaluation.
  const resp = await openai.responses.create({
    model: policy.model,
    input: [
      { role: "system", content: buildFitSystemPrompt() },
      { role: "user", content: buildFitUserPrompt(jd, candidate) },
    ],
    text: {
      verbosity: policy.verbosity,
      format: {
        type: "json_schema",
        name: "fit_v1",
        strict: true,
        schema: FitV1JsonObject,
      },
    },
    // Controls how much the model "thinks"
    reasoning: { effort: policy.effort },

    // Keep output bounded
    max_output_tokens: FIT_MAX_OUTPUT_TOKENS,
  });


  // Parse the output text into a JSON object
  const parsed = parseJsonSchemaOutputOrThrow<FitV1Response>(resp, {
    tag: "fit_v1",
    meta: { tier, model: policy.model, jdLen: jd.length, candidateLen: candidate.length },
  });

  return {
    payload: normalizeFitV1Response(parsed),
    model: policy.model,
    tier,
  };
}



// ------------ HELPER FUNCTIONS ------------

/**
 * JdExtractV1: Build the system prompt for the AI request to extract the job description.
 */
// function buildExtractJdSystemPrompt(): string {
//   return [
//     "You extract structured fields from a pasted job description.",
//     "Return ONLY JSON matching the provided schema.",
//     "",
//     "Rules:",
//     "- If a field is not clearly present, omit it (do NOT guess).",
//     "- Prefer omitting workMode/jobType rather than using UNKNOWN.",
//     "- Do NOT invent details (e.g., hybrid days, contract length) unless explicitly stated.",
//     "- jdSummary: 2–4 sentences in your own words. Must cover: (1) what the role does (key responsibilities), (2) key stack/tools if present, (3) must-have requirements if present, (4) location/work arrangement if present. Do NOT just copy sentences from the JD.",
//     "- notes: 5–10 short bullets spanning responsibilities, stack/tools, requirements, and any constraints (visa, schedule, on-call, etc.). Avoid repeating jdSummary.",
//     "Field semantics (do NOT mix these):",
//     "- jobLink = the job posting URL ONLY (https://...). Prefer the most direct job posting link (not the company homepage). If multiple links exist, choose the best canonical posting link; otherwise use the first explicit posting URL. Omit if no link is present or related to the company or job description. CHOOSE A LINK TO THE DIRECT JOB POSTING OVER A LINK TO THE COMPANY HOMEPAGE. IF NEITHER IS PRESENT, OMIT.",
//     "- location = a geographic place only (country/city/region). Use the FIRST listed location as the primary. If multiple locations are listed, set location to '<primary> +<N>' where N is the count of additional locations. Never use 'Remote/Hybrid/Onsite' as location.",
//     "- workMode = ENUMS: workMode must be exactly 'REMOTE' | 'HYBRID' | 'ONSITE' (uppercase) or omitted. (ONLY if explicitly stated; must be EXACT uppercase enum).",
//     "- locationDetails = geographic constraints/alternatives/specifics ONLY (e.g. '1235 Main St.', 'Open to 5 locations within Canada', 'Toronto or Montreal', 'Must reside in Ontario', time zone). OR If location includes '+N', list the OTHER locations here (excluding the primary), e.g. 'Other locations: Waterloo, ON; Buffalo, NY' (separated by semicolon, keep it brief, NO 'In-Office' NO 'also in' etc.). Do NOT put days/week or schedule here (e.g. DO NOT put 'Hybrid — 2 days/week in office'). Omit and leave blank if no LOCATION info (DO NOT PUT INFO ABOUT HYBRID WORK, ETC. INTO LOCATIONDETAILS).",
//     "- workModeDetails = schedule/cadence expectations: days onsite, cadence, flexibility, etc. (e.g. 'Hybrid: 3 days/week in office', 'Remote-first with quarterly onsite'). If not stated, omit.",
//     "- jobTypeDetails = extra job type constraints ONLY if stated (contract length, hours, shift, on-call, travel). If not stated, omit.",
//     "- salaryText = must be only the base pay numeric amount/range with currency (e.g., CAD $80k-$120k); exclude any extra words and exclude bonus/equity/benefits/commission/signing bonus (put non-base comp in salaryDetails).",
//     "- salaryDetails = Capture extra compensation details beyond base pay ONLY if explicitly stated (e.g. 'annual/target/expected bonus, stock/equity/RSUs/options, signing bonus, relocation assistance, commission/OTE, profit sharing, RRSP/401k matching, on-call/overtime/shift premiums, any conditions (e.g. 'bonus up to 15%', 'equity grant', 'performance-based' etc.)'). Keep it short. Do NOT repeat base salary numbers. Omit if not stated.",
//     "",
//     "Tags:",
//     "- tagsText: 5–10 short keyword tags inferred ONLY from explicit JD text (stack, domain, constraints). Examples: 'Node.js, TypeScript, Fastify, PostgreSQL, Prisma, JWT, CI/CD, GCP, Remote, Redis, Observability'.",
//     "- Do not invent tags for tools/tech not mentioned.",
//     "",
//     "Warnings:",
//     "- return [] unless (a) critical info is missing/unclear OR (b) the JD states an explicit constraint/disqualifier (no visa sponsorship, must be enrolled, must graduate after X, citizenship/clearance required, location eligibility constraints, etc.).",
//     "- If a constraint/disqualifier is present, add it as a warning string (e.g., 'No visa sponsorship').",
//     "- If a constraint/disqualifier is present, include add the end of notes too as a bullet starting with 'Constraint: Requires/Restrictions/Disqualifiers etc. ...'.",

//   ].join("\n");
// }

function buildExtractJdSystemPrompt(): string {
  return [
    "You extract structured fields from a pasted job description (JD).",
    "Return ONLY valid JSON matching the provided schema. No markdown. No extra keys.",
    "",
    "Hard constraints (must follow):",
    "- Use ONLY information explicitly present in the JD text.",
    "- If a field is not clearly present, OMIT it entirely (do NOT output null, empty string, 'UNKNOWN', 'NONE', 'N/A', 'Other locations: None', or placeholder text).",
    "- NEVER output the literal strings: 'NONE', 'N/A', 'Unknown', 'Other locations: None'.",
    "",
    "Determinism / consistency rules:",
    "- If multiple candidates exist for a field, choose the earliest explicit mention that best matches the field semantics.",
    "- If unsure whether something qualifies for a field, OMIT it and (optionally) add a warning describing the ambiguity.",
    "",
    "Company / position rules:",
    "- company: choose the canonical employer name (e.g., 'Amazon', 'Google', 'Deloitte').",
    "- If the JD mentions a sub-org (e.g., 'Amazon Transportation', 'SCOT'), do NOT put that in company unless the employer name is absent. Instead, include the sub-org in tagsText or notes.",
    "- position: the role title (e.g., 'Software Development Engineer').",
    "",
    "Job ID rules:",
    "- If a Job ID / Req ID is present (e.g., 'Job ID: 3133498'), include it as a bullet in notes exactly like: 'Job ID: 3133498'.",
    "",
    "jobLink rules (very strict):",
    "- jobLink must be a meaningful link present in the JD text. NEVER try to find a link not explicitly included.",
    "- Allowed jobLink values:",
    "  (1) A direct job posting URL (preferred), OR",
    "  (2) A company homepage URL ONLY IF it is explicitly included in the JD text.",
    "- Consider a URL a 'direct job posting' ONLY if it clearly looks like a posting, for example it contains:",
    "  * '/jobs/' or '/job/' or '/careers/' with a job detail path, OR",
    "  * a known ATS domain/path (greenhouse.io, lever.co, workday, ashbyhq, icims, smartrecruiters), OR",
    "  * the job/req id in the URL (e.g., '3133498' appears in the URL).",
    "- If the only URLs are informational/support links (e.g., accommodations pages, generic videos, org pages), OMIT jobLink.",
    "",
    "location rules (fix internal codes like K03):",
    "- location must be a geographic place only (country/city/region).",
    "- Ignore internal site/building codes and non-geographic suffixes like 'K03', 'R260000290', 'Req-123', etc. These are NOT locations.",
    "- If the only 'location-ish' text is a non-geographic code, OMIT location and add a warning like: 'Location unclear (only internal site code provided)'.",
    "- If the JD explicitly indicates a country/region (e.g., contains 'Canada', 'United States', 'Ontario', 'Toronto'), set location to that geographic place.",
    "- If multiple real geographic locations are listed, set location to '<primary> +<N>' where N is count of additional locations.",
    "",
    "locationDetails rules:",
    "- locationDetails contains ONLY geographic specifics/constraints/alternatives:",
    "  * residency constraints (e.g., 'Must reside in Ontario', 'Canada only')",
    "  * time zone constraints",
    "  * office address",
    "  * additional locations (ONLY if actually present) formatted exactly: 'Other locations: <loc1>, <loc2>, ...' using comma+space delimiter.",
    "- NEVER put work arrangement cadence here (no days/week).",
    "- NEVER output locationDetails if there are no real details.",
    "",
    "workMode rules:",
    "- workMode must be EXACTLY one of: 'REMOTE' | 'HYBRID' | 'ONSITE' (uppercase).",
    "- Only set if explicitly stated (e.g., 'remote', 'hybrid', 'in office', 'on-site'). Otherwise omit.",
    "",
    "workModeDetails rules:",
    "- workModeDetails is ONLY schedule/cadence expectations explicitly stated (e.g., 'Hybrid: 3 days/week in office', 'Quarterly onsite').",
    "- Do NOT put benefits text here. If not explicitly stated, omit.",
    "",
    "jobType / jobTypeDetails rules:",
    "- jobType: only set if explicitly stated and matches schema enums.",
    "- jobTypeDetails: only extra constraints explicitly stated (contract length, hours, shift, on-call, travel).",
    "- Do NOT put benefits text here. If not stated, omit.",
    "",
    "salaryText rules:",
    "- salaryText must contain ONLY the base pay numeric amount/range with currency (e.g., 'CAD $80k-$120k').",
    "- If salary is not explicitly stated, omit salaryText.",
    "",
    "salaryDetails rules:",
    "- salaryDetails: ONLY non-base compensation explicitly stated (bonus %, equity, commission/OTE, signing, relocation, matching, premiums).",
    "- Keep short. Do NOT repeat base salary numbers. Omit if not stated.",
    "",
    "jdSummary rules:",
    "- 2–4 sentences in your own words. Cover (if present): responsibilities, key stack/tools, must-have requirements, location/work arrangement.",
    "- Do NOT copy sentences verbatim from the JD.",
    "",
    "notes rules:",
    "- 5–10 short bullet strings.",
    "- Include responsibilities, stack/tools, requirements, and constraints if present.",
    "- Include 'Job ID: <id>' if present.",
    "- Avoid repeating jdSummary.",
    "",
    "tagsText rules (fix rendering):",
    "- tagsText must be a SINGLE STRING of 5–10 tags separated ONLY by comma+space: ', '.",
    "- NEVER use semicolons. NEVER use newline separators.",
    "- No duplicates. No trailing comma.",
    "- Only include tools/terms explicitly present in the JD text (do NOT invent).",
    "",
    "warnings rules:",
    "- warnings must be an array of strings.",
    "- Return [] unless:",
    "  (a) critical info is missing/unclear (e.g., location ambiguous or only internal site code), OR",
    "  (b) explicit constraints/disqualifiers exist (no visa, clearance, citizenship, location eligibility, enrollment, graduation window).",
  ].join("\n");
}



/**
 * FitV1: Build the system prompt for the AI request to evaluate the candidate-to-job fit.
 * 
 * buildFitSystemPrompt() is used to build the system prompt for the AI request with the instructions for the AI on how to evaluate the fit.
 * 
 * buildFitUserPrompt() is used to build the user prompt for the AI request with the job description and candidate history text.
 */
// function buildFitSystemPrompt(): string {
//   return [
//     "You are generating an informational candidate-to-job fit summary for the candidate (NOT a hiring decision).",
//     "Evaluate fit using ONLY the provided job description and candidate history text.",
//     "Return ONLY JSON matching the provided schema. No markdown. No extra keys.",
//     "",
//     "Safety + privacy rules:",
//     "- Do NOT use or mention protected traits (age, race, gender, religion, disability, etc.), even if present in the text.",
//     "- Do NOT output any personal contact info or identifiers (email, phone, address, links). If a snippet contains any, redact it as '[REDACTED]'.",
//     "- Keep evidence snippets short (<= 12 words) and only from candidate text. Never quote the JD verbatim.",
//     "",
//     "Truthfulness rules:",
//     "- Only claim a skill/experience if it is explicitly stated in the candidate text.",
//     "- If something seems likely but is NOT explicit, you MAY mention it only as 'Inferred (not explicit): ...' and you MUST NOT use it to justify a higher score or 'high' confidence.",
//     "- Do not invent requirements not present in the JD.",
//     "",
//     "Scoring rubric (0–100):",
//     "- 90–100: clear evidence of most must-haves + strong directly relevant experience.",
//     "- 70–89: good match but some must-haves unclear/missing.",
//     "- 40–69: partial match; several key gaps.",
//     "- 0–39: weak match; major requirements not evidenced.",
//     "Confidence:",
//     "- high only when the texts clearly support the score; medium when key items are unclear; low when evidence is thin.",
//     "",
//     "Writing style (make it read well):",
//   "- Write directly to the candidate in second-person (use 'you').",
//   "- Use complete sentences with natural flow; avoid robotic 'Evidence: ... — Why: ...' phrasing.",
//   "- Each list item must still be a SINGLE STRING (no sub-bullets). Keep each item max 2 sentences.",
//   "- You MAY mention a project name ONLY if it appears in the candidate text; otherwise say 'one of your projects'.",
//   "",
//   "Output constraints (tight + non-redundant):",
//   "- strengths: max 7 items.",
//   "  - strengths[0] MUST be a 2–3 sentence overall summary on the biggest stack/role alignments for the candidate in your own words (do NOT just quote the JD).",
//   "  - strengths[1..] rough format: '<Topic> — You have <relevant experience> (Evidence: \"<<=12 words from candidate>\"). <Optional: This matters because <why it helps for this role>>.'",
//   "- gaps: max 7 items.",
//   "  - gaps[0] MUST be a 2–3 sentence summary on the biggest blockers and what would raise the score most.",
//   "  - gaps[1..] rough format: '<Gap> — You do not show explicit evidence of <missing requirement>. <Optional: This matters because <impact>>. Fast path: <quick action/suggestion>.'",
//   "- keywordGaps: max 12 UNIQUE items. Include missing tools/tech AND derived concepts when relevant.",
//   "  Prefer (1) tools/tech/platforms, then (2) architecture/process concepts. Mark inferred items as 'Inferred (not explicit): ...'.",
//   "- recommendedEdits: max 7 items. Must be grounded in candidate text; do not invent metrics. Format: '<edit> — Why: <reason>'.",
//   "- questionsToAsk: max 5 questions the CANDIDATE should ask the EMPLOYER (not questions asked to the candidate).",
//   "  Focus on clarifying gaps, expectations, success criteria, stack, and what strong performance looks like.",
//   "",
//   "Avoid repetition across fields. If something appears as a gap, don't restate it as a keyword gap unless the keyword adds specificity.",
//   "",
//   "If you cannot comply for any reason, still return valid JSON with:",
//   "- score: 0, confidence: 'low', and strengths[0]/gaps[0] explaining that the output could not be generated from the provided text.",
//   ].join("\n");
// }

function buildFitSystemPrompt(): string {
  return [
    "You are generating an informational candidate-to-job fit summary for the candidate (NOT a hiring decision).",
    "Evaluate fit using ONLY the provided job description text and candidate history text.",
    "Return ONLY valid JSON matching the provided schema. No markdown. No commentary. No extra keys.",

    "",
    "Safety + privacy rules (strict):",
    "- Do NOT use, infer, or mention protected traits (age, race, gender, religion, disability, etc.), even if present.",
    "- Do NOT output personal contact info or identifiers (email, phone, address, links, usernames, company-internal IDs).",
    "- If candidate evidence contains any personal contact info, redact it as '[REDACTED]' inside the snippet.",
    "- Never quote the job description verbatim. Evidence snippets must come ONLY from candidate text.",

    "",
    "Truthfulness rules:",
    "- Only claim a skill/experience if explicitly stated in the candidate text.",
    "- If something seems likely but is NOT explicit, you MAY mention it only as 'Inferred (not explicit): ...'.",
    "- Inferred items must NOT increase the score or justify 'high' confidence.",
    "- Do not invent requirements. Do not assume years of experience, seniority, or tooling unless explicitly stated.",

    "",
    "Method (follow this process internally, but do NOT output the steps):",
    "1) Extract requirements from the JD into: must-haves, nice-to-haves, responsibilities, constraints (e.g., location, clearance, degree) ONLY if explicitly present.",
    "2) Map candidate evidence to each must-have first, then nice-to-haves. Use short candidate-only snippets for support.",
    "3) Determine gaps only when the JD requires something and the candidate text lacks explicit evidence.",
    "4) Produce a score and confidence that reflect evidence coverage and certainty.",

    "",
    "Scoring rubric (0–100):",
    "- Weight must-haves heavily. Missing/unclear must-haves should cap the score.",
    "- 90–100: strong explicit evidence for most must-haves + directly relevant experience/responsibilities.",
    "- 70–89: good match but some must-haves are unclear/missing OR relevance is solid but not deep.",
    "- 40–69: partial match; multiple key must-haves missing/unclear; some relevant overlap exists.",
    "- 0–39: weak match; major must-haves not evidenced OR constraints conflict (only if explicitly stated in JD).",

    "",
    "Confidence rules:",
    "- high: candidate text clearly supports the score and most must-haves have explicit evidence.",
    "- medium: some must-haves are partially evidenced or unclear; score involves interpretation.",
    "- low: evidence is thin, candidate text is sparse, or many must-haves are missing/unclear.",

    "",
    "Evidence snippet rules (important):",
    "- Snippets must be <= 12 words and copied from candidate text only.",
    "- Do NOT include JD phrases in snippets.",
    "- If a snippet contains contact info, replace that portion with '[REDACTED]'.",
    "- Use at most ONE snippet per list item. Keep it short and meaningful.",

    "",
    "Writing style:",
    "- Write directly to the candidate in second-person (use 'you').",
    "- Use complete sentences with natural flow; avoid robotic 'Evidence — Why' repetition.",
    "- Each list item must be a SINGLE STRING (no sub-bullets). Max 2 sentences per item.",
    "- You MAY mention a project name only if it appears in candidate text; otherwise say 'one of your projects'.",

    "",
    "Output constraints (tight + non-redundant):",
    "- strengths: max 7 items.",
    "  - strengths[0] MUST be a 2–3 sentence overall summary of the biggest alignments (in your own words). No JD quoting.",
    "  - strengths[1..] Format guidance:",
    "    '<Topic> — <1–2 sentences describing your evidence-backed alignment> (Evidence: \"<snippet>\").'",
    "",
    "- gaps: max 7 items.",
    "  - gaps[0] MUST be a 2–3 sentence summary of the biggest blockers and what would raise the score most.",
    "  - gaps[1..] Format guidance:",
    "    '<Gap> — You do not show explicit evidence of <requirement>. Fast path: <quick action>.'",
    "  - Only include gaps that come from the JD requirements/constraints.",

    "",
    "- keywordGaps: max 12 UNIQUE items.",
    "  - Include missing tools/tech/platforms AND missing architecture/process concepts when relevant to the JD.",
    "  - Prefer (1) tools/tech/platforms, then (2) architecture/process concepts.",
    "  - If you include an inferred item, write it exactly as: 'Inferred (not explicit): <item>'.",
    "  - Do not repeat items already clearly stated in gaps unless the keyword adds specificity.",

    "",
    "- recommendedEdits: max 7 items.",
    "  - Must be grounded in candidate text (rephrase, reorder, clarify, add missing context).",
    "  - Do NOT invent metrics, employers, titles, dates, or tools.",
    "  - Format: '<edit suggestion> — Why: <reason>'.",

    "",
    "- questionsToAsk: max 5 questions the CANDIDATE should ask the EMPLOYER (not questions to the candidate).",
    "  - Focus on clarifying unclear requirements, expectations, success criteria, stack details, and what strong performance looks like.",

    "",
    "Avoid repetition across fields. If something appears in gaps, don't restate it in strengths.",
    "If there is insufficient text to evaluate, still return valid JSON with score=0, confidence='low', and strengths[0]/gaps[0] explaining what was missing.",
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


// Context for the AI parse operation.
type AiParseContext = {
  tag: string; // e.g. "fit_v1", "jd_extract_v1"
  meta?: Record<string, unknown>; // e.g. { jdLen, candidateLen }
};


/**
 * Parse the response from the AI request and throw an error if the response is invalid.
 */
function parseJsonSchemaOutputOrThrow<T>(resp: any, ctx: AiParseContext): T {
  
  const usage = getTokenUsage(resp);

  // Usage log (searchable in Cloud Run logs)
  console.log(
    JSON.stringify({
      msg: "[ai.usage]",
      tag: ctx.tag,
      id: resp?.id ?? null,
      model: resp?.model ?? null,
      status: resp?.status ?? null,
      incomplete_reason: resp?.incomplete_details?.reason ?? null,
      usage,
    })
  );

  const debug = classifyOpenAIResponse(resp);
  const outputText = (resp.output_text ?? "").trim();
  const refusal = extractRefusalText(resp);
  const anyText = extractAnyTextPreview(resp);

  const shouldDebugLog =
    process.env.AI_DEBUG === "true" || !outputText || debug.status !== "completed";

  if (shouldDebugLog) {
    console.warn(`[ai.${ctx.tag}] response`, {
      ...(ctx.meta ?? {}),
      ...debug,
      refusalPreview: refusal ? redactSample(refusal.slice(0, 300)) : null,
      anyTextPreview: anyText ? redactSample(anyText.slice(0, 300)) : null,
      outputHead: outputText ? redactSample(outputText.slice(0, 300)) : null,
      outputTail: outputText ? redactSample(outputText.slice(-300)) : null,
    });
  }

  // Hard fail early with the REAL reason
  if (debug.status !== "completed") {
    throw new AppError(
      refusal
        ? `AI refused the request (status=${debug.status}).`
        : `AI did not complete (status=${debug.status}, reason=${debug.incompleteReason ?? "unknown"}, tokens=${usage.total} [in=${usage.input}, out=${usage.output}]).`,
      502,
      "AI_REFUSED"
    );
  }

  if (!outputText) {
    throw new AppError(
      refusal
        ? "AI refused the request (completed but refusal/empty output)."
        : "AI completed but returned empty output_text.",
      502,
      "AI_EMPTY_OUTPUT"
    );
  }

  return safeJsonParse<T>(outputText);
}

// Extract the refusal text from the response.
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

// Extract any text preview from the response.
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

// Classify the OpenAI response.
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


/**
 * Safely parse the JSON string into a JSON object.
 */ 
function safeJsonParse<T>(raw: string | null | undefined): T {
  const original = (raw ?? "").trim();

  if (!original) {
    console.warn("[ai] safeJsonParse: empty output_text");
    throw new AppError("AI returned invalid JSON", 502, "AI_INVALID_JSON");
  }

  // Strip ```json fences if present
  const unfenced = original.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();

  // First parse attempt
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    // continue
  }

  // Second parse attempt: extract the largest JSON-looking substring
  const extracted = tryExtractJsonSubstring(unfenced);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // continue
    }
  }

  // Log redacted previews for debugging (structure only, no content)
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

  throw new AppError("AI returned invalid JSON", 502, "AI_INVALID_JSON");
}

// Try to extract a JSON substring from the text.
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

// Redact letters/numbers to avoid leaking content in logs while keeping JSON structure visible
function redactSample(s: string) {
  return s.replace(/[A-Za-z0-9]/g, "x");
}


/**
 * Get the token usage from the response.
 */
function getTokenUsage(resp: any) {
  const u = resp?.usage ?? {};
  const input = u.input_tokens ?? u.prompt_tokens ?? 0;
  const output = u.output_tokens ?? u.completion_tokens ?? 0;
  const total = u.total_tokens ?? (input + output);
  return { input, output, total, raw: u };
}


