import { UserPlan } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";
import { OPENAI_MODEL, getOpenAIClient, AI_MODELS, getJdExtractFallbackOpenAIModel } from "./openai.js";
import {
  ApplicationFromJdJsonObject,
  normalizeApplicationFromJdResponse,
  cleanJdText,
  sanitizeJdForModerationRetry,
  FitV1JsonObject,
  normalizeFitV1Response,

  FitV1RunResult,
} from "./ai.dto.js";
import type { ApplicationFromJdResponse, DraftSource, FitV1Response } from "./ai.dto.js";
import { AiTier } from "./ai-tier.js";
import { getExecutionProfile } from "../plan/entitlement-policy.js";
import { throwIfAborted } from "../../lib/request-abort.js";
import { extractJobPostingFromUrl } from "./job-link-extraction.js";

/**
 * When `AI_LOG_JD_EXTRACT_INPUT=true`, logs full JD strings (scraped + each OpenAI user payload).
 * Dev-only: postings can contain PII; do not enable in shared/production logs.
 */
function logJdExtractInput(args: {
  phase: "scraped" | "api_input" | "api_input_moderation_retry";
  sourceMode?: "TEXT" | "LINK";
  sourceUrl?: string;
  model?: string;
  text: string;
}) {
  if (process.env.AI_LOG_JD_EXTRACT_INPUT !== "true") return;
  console.log(
    JSON.stringify({
      msg: "[ai.jd_extract_input]",
      phase: args.phase,
      sourceMode: args.sourceMode ?? null,
      sourceUrl: args.sourceUrl ?? null,
      model: args.model ?? null,
      len: args.text.length,
      text: args.text,
    })
  );
}

/**
 * Service layer for the AI module:
 * - Keep OpenAI usage out of the HTTP route handlers
 * - Enforces user scoping + basic normalization
 */

/**
 * JD_EXTRACT_V1: Turns pasted JD text into an application draft response.
 * `sourceMode` defaults to "TEXT" for pasted input; pass "LINK" when the text
 * was fetched from a job-posting URL so the prompt gets a link-appropriate hint.
 */
export async function buildApplicationDraftFromJd(
  jdText:  string,
  opts?: { signal?: AbortSignal; sourceMode?: "TEXT" | "LINK"; sourceUrl?: string }
): Promise<ApplicationFromJdResponse> {

  const JD_EXTRACT_MAX_OUTPUT_TOKENS = 5000;

  const jd = cleanJdText((jdText ?? "").trim());

  // Validate inputs
  if (!jd) throw new AppError("Job description is missing.", 400, "JOB_DESCRIPTION_MISSING");

  throwIfAborted(opts?.signal);
  
  // Get the OpenAI client and model.
  const openai = getOpenAIClient();
  const primaryModel = AI_MODELS.JD_EXTRACT;
  const fallbackModel = getJdExtractFallbackOpenAIModel();
  const modelsToTry = fallbackModel && fallbackModel !== primaryModel
    ? [primaryModel, fallbackModel]
    : [primaryModel];

  const sanitized = sanitizeJdForModerationRetry(jd);
  const contentFilterThrow = {
    message:
      "This posting could not be processed automatically because the AI provider blocked part of the content. " +
      'Copy the job description from the page and use "Paste text" instead, or try another URL.',
    code:       "JD_CONTENT_FILTER" as const,
    statusCode: 422,
  };

  let resp: any = null;

  outer: for (const model of modelsToTry) {
    const userVariants = sanitized !== jd ? [jd, sanitized] : [jd];
    for (const userContent of userVariants) {
      throwIfAborted(opts?.signal);
      logJdExtractInput({
        phase: userContent === jd ? "api_input" : "api_input_moderation_retry",
        sourceMode: opts?.sourceMode,
        sourceUrl: opts?.sourceUrl,
        model,
        text: userContent,
      });
      resp = await openai.responses.create(
        {
          model,
          input: [
            { role: "system", content: buildExtractJdSystemPrompt({ sourceMode: opts?.sourceMode }) },
            { role: "user",   content: userContent },
          ],
          text: {
            verbosity: "low",
            format: {
              type:   "json_schema",
              name:   "application_from_jd_v1",
              strict: true,
              schema: ApplicationFromJdJsonObject,
            },
          },
          reasoning:         { effort: "low" },
          max_output_tokens: JD_EXTRACT_MAX_OUTPUT_TOKENS,
        },
        { signal: opts?.signal }
      );

      const classified = classifyOpenAIResponse(resp);
      if (classified.status === "completed") {
        break outer;
      }

      if (classified.incompleteReason !== "content_filter") {
        parseJsonSchemaOutputOrThrow<ApplicationFromJdResponse>(resp, {
          tag:  "jd_extract_v1",
          meta: { jdLen: jd.length, model },
        });
      }
    }
  }

  // Parse the output text into a JSON object (throws with JD_CONTENT_FILTER on final content_filter)
  const parsed = parseJsonSchemaOutputOrThrow<ApplicationFromJdResponse>(resp, {
    tag:  "jd_extract_v1",
    meta: { jdLen: jd.length },
  }, { onContentFilter: contentFilterThrow });

  // Build the canonical source metadata
  const source: DraftSource = {
    mode:            opts?.sourceMode ?? "TEXT",
    canonicalJdText: jd,
    ...(opts?.sourceUrl ? { sourceUrl: opts.sourceUrl } : {}),
  };

  // Return the normalized response with source attached
  return normalizeApplicationFromJdResponse(parsed, source);
}


/**
 * JD_EXTRACT_V1 via URL: Fetches a job-posting page, extracts canonical text,
 * then runs it through the same extraction pipeline as pasted JD text.
 *
 * The returned draft is identical in shape to buildApplicationDraftFromJd —
 * the frontend form handles both the same way.
 * `source.jobLink` defaults to the normalized URL if the AI extracts no link.
 */
export async function buildApplicationDraftFromJobLink(
  rawUrl: string,
  opts?: { signal?: AbortSignal }
): Promise<ApplicationFromJdResponse> {
  throwIfAborted(opts?.signal);

  // Step 1 — fetch + extract canonical text (throws AppError on failure)
  const { normalizedUrl, canonicalJdText } = await extractJobPostingFromUrl(rawUrl, opts);

  logJdExtractInput({
    phase:      "scraped",
    sourceMode: "LINK",
    sourceUrl:  normalizedUrl,
    text:       canonicalJdText,
  });

  throwIfAborted(opts?.signal);

  // Step 2 — run through the same AI extraction pipeline, with LINK hint
  const draft = await buildApplicationDraftFromJd(canonicalJdText, {
    signal:     opts?.signal,
    sourceMode: "LINK",
    sourceUrl:  normalizedUrl,
  });

  // Step 3 — Use the source URL as the job link.
  // The user explicitly provided this URL, so it's definitively the posting link.
  draft.extracted.jobLink = normalizedUrl;

  // Step 4 — use model-cleaned JD text as canonicalJdText.
  // The model was asked to strip site chrome and return only the real job
  // posting content. If it returned something useful, use that instead of
  // the raw scraped text so the stored description is clean.
  if (draft.ai?.cleanedJdText) {
    draft.source = {
      ...draft.source,
      canonicalJdText: draft.ai.cleanedJdText,
    };
  }

  return draft;
}



/**
 * FIT_V1: Generates a fit of compatibility between the candidate and the job description using the canonical JD text + extracted candidate-history text.
 */
export async function buildFitV1(
  jdText: string, 
  candidateText: string, 
  opts?: { tier?: AiTier; signal?: AbortSignal}
): Promise<FitV1RunResult> {
  const jd = (jdText ?? "").trim();
  const candidate = (candidateText ?? "").trim();

  // Validate inputs
  if (!jd) throw new AppError("Job description is missing.", 400, "JOB_DESCRIPTION_MISSING");
  if (!candidate) throw new AppError("Candidate history is missing.", 400, "CANDIDATE_HISTORY_MISSING");

  // Get the OpenAI client.
  const openai = getOpenAIClient();

  // Get the user's plan.
  const tier: AiTier = opts?.tier ?? UserPlan.REGULAR;
  
  // Resolve plan-aware execution profile (effort, verbosity, maxOutputTokens).
  const policy = getExecutionProfile(tier);

  // Throw an error if the request is aborted.
  throwIfAborted(opts?.signal);

  
  // Make the OpenAI request for the fit evaluation.
  const resp = await openai.responses.create(
    {
      model: OPENAI_MODEL,
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
      reasoning: { effort: policy.effort },        // Controls how much the model "thinks"
      max_output_tokens: policy.maxOutputTokens,   // Keep output bounded
    },
    { signal: opts?.signal }
  );


  // Parse the output text into a JSON object
  const parsed = parseJsonSchemaOutputOrThrow<FitV1Response>(resp, {
    tag: "fit_v1",
    meta: { tier, model: OPENAI_MODEL, jdLen: jd.length, candidateLen: candidate.length },
  });

  // Extract token usage from resp directly — getTokenUsage is a local helper
  const fitUsage = getTokenUsage(resp);

  return {
    payload: normalizeFitV1Response(parsed),
    model:   OPENAI_MODEL,
    tier,
    usage:   { input: fitUsage.input, output: fitUsage.output, total: fitUsage.total },
  };
}



// ------------ HELPER FUNCTIONS ------------

/**
 * JdExtractV1: Build the system prompt for the AI request to extract the job description.
 */
/**
 * JdExtractV1: Build the system prompt for JD extraction.
 * `sourceMode: "LINK"` adds extra instructions telling the model to ignore
 * page chrome/noise (nav, footer, legal, share buttons, etc.) that is common
 * when text is scraped from a job-posting web page.
 */
function buildExtractJdSystemPrompt(opts?: { sourceMode?: "TEXT" | "LINK" }): string {
  const lines = [
    "You extract structured fields from a job description.",
    "Return ONLY JSON matching the provided schema.",
    "",
  ];

  if (opts?.sourceMode === "LINK") {
    lines.push(
      "Input note: this text was scraped from a web page and may contain site chrome",
      "(navigation menus, footers, cookie banners, share buttons, legal boilerplate).",
      "Ignore all non-job content. Extract only details that describe the actual role.",
      "",
      "For LINK mode — also populate cleanedJdText:",
      "- cleanedJdText: copy only the actual job posting text. Start with the job title,",
      "  company name, and location if present, then include overview, responsibilities,",
      "  qualifications, and compensation + other sections related specifically to the role.", 
      "  Strip ALL site chrome, login prompts, similar-job",
      "  listings, footer links, and anything unrelated to this specific role.",
      "  Preserve the original wording — do NOT summarize or rewrite.",
      "  Format: keep section headers (Responsibilities, Qualifications, etc.) on their own",
      "  lines. Put each bullet point or list item on its own line. Separate sections with",
      "  a blank line. This makes the stored description readable.",
      "  If the input is already clean and well-formatted, copy it as-is.",
      "",
    );
  } else {
    lines.push(
      "- cleanedJdText: set to null (only used for LINK mode).",
      "",
    );
  }

  lines.push(
    "Rules:",
    "- If a field is not clearly present, omit it (do NOT guess).",
    "- Prefer omitting workMode/jobType rather than using UNKNOWN.",
    "- Do NOT invent details (e.g., hybrid days, contract length) unless explicitly stated.",
    "- jdSummary: 2–4 sentences in your own words. Must cover: (1) what the role does (key responsibilities), (2) key stack/tools if present, (3) must-have requirements if present, (4) location/work arrangement if present. Do NOT just copy sentences from the JD.",
    "",
    "Field semantics (do NOT mix these):",
    "- jobLink = the job posting URL ONLY (https://...). USE ONLY: the direct link to the job posting (if included) OR the company website link. If neither exists OMIT. DO NOT INCLUDE LINKS UNRELATED TO THE JOB OR COMPANY.",
    "",
    "- location format rules (IMPORTANT — follow exactly):",
    "  * Use 'City, Province/State' for North American locations (e.g. 'Toronto, ON', 'San Francisco, CA').",
    "  * Use province/state ABBREVIATIONS — never spell them out (Ontario → ON, California → CA).",
    "  * Use 'City, Country' for international locations (e.g. 'London, UK', 'Berlin, Germany').",
    "  * If only a country is given, use just the country name (e.g. 'Canada', 'United States').",
    "  * If multiple locations, set location to '<primary> +<N>' where N = count of additional locations (e.g. 'Toronto, ON +2').",
    "  * Never use 'Remote', 'Hybrid', or 'Onsite' as a location — those belong in workMode/workModeDetails.",
    "",
    "- locationDetails = geographic constraints/alternatives ONLY — e.g. additional office cities, address, must-reside region ('Other locations: Waterloo, ON; Buffalo, NY'). NEVER put province, state, or country names here if they are already part of the primary location field. Omit if nothing beyond the primary location.",
    "- workMode = ENUMS: exactly 'REMOTE' | 'HYBRID' | 'ONSITE' (uppercase) or omitted.",
    "- workModeDetails = schedule/cadence expectations only (e.g. 'Hybrid: 3 days/week in office'). Omit if not stated.",
    "- jobTypeDetails = extra job type constraints only if stated (contract length, hours, shift). Omit if not stated.",
    "",
    "- salaryText format rules (IMPORTANT — follow exactly):",
    "  * Format: '$X – $Y CURRENCY' for ranges (em-dash, currency code at end).",
    "  * Format: '$X CURRENCY' for single values.",
    "  * Format: '$X/hr CURRENCY' for hourly rates.",
    "  * Always expand shorthand: 80k → $80,000  |  80.5k → $80,500.",
    "  * Always add '$' prefix if missing.",
    "  * Currency code (CAD, USD, GBP, etc.) goes at the END.",
    "  * Examples: '$80,000 – $120,000 CAD'  |  '$25/hr USD'  |  '$150,000 USD'.",
    "  * Exclude bonus/equity/benefits (put those in salaryDetails).",
    "  * MULTI-REGION: if multiple regional salary ranges are listed (e.g. USD and CAD),",
    "    pick ONE for salaryText — prefer the range matching the job's primary location,",
    "    or the first range listed if location is ambiguous. Put the other range(s) in salaryDetails.",
    "",
    "- salaryDetails = extra compensation context only if explicitly stated. Keep short.",
    "  Includes: bonus, equity, RSUs, signing bonus, other regional salary ranges not in salaryText.",
    "  Do NOT repeat the base salary already in salaryText. Omit if nothing applies.",
    "",
    "Tags:",
    "- tagsText: 5–10 short keyword tags inferred ONLY from explicit JD text (stack, domain, constraints).",
    "  Return as comma-separated values (e.g. 'Node.js, TypeScript, PostgreSQL, Remote, CI/CD').",
    "  Do not invent tags for tools/tech not mentioned.",
    "",
    "Notes:",
    "- notes: 5–10 short bullets spanning responsibilities, stack/tools, requirements, and constraints.",
    "- IMPORTANT: If the job description contains a specific Job ID, Job Number, Requisition ID, or Reference Number,",
    "  include it as the VERY FIRST bullet in this exact format: 'Job ID: <value>'",
    "  (e.g. 'Job ID: R260003457', 'Job ID: P71181'). Use the exact identifier as shown.",
    "- Avoid repeating jdSummary content.",
    "",
    "Warnings:",
    "- return [] unless (a) critical info is missing/unclear OR (b) the JD states an explicit constraint/disqualifier",
    "  (no visa sponsorship, must be enrolled, citizenship/clearance required, location eligibility, etc.).",
    "- If a constraint is present, add it as a warning string (e.g., 'No visa sponsorship').",
    "- If a constraint is present, also include it at the END of notes as a bullet starting with 'Constraint: ...'.",
  );

  return lines.join("\n");
}

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
    "ANTI-OVERFITTING RULE (important):",
    "- Return an EMPTY ARRAY for any field where you have nothing genuine to say.",
    "- Do NOT manufacture content to fill a field. Empty = the candidate handled this area extremely well / perfectly.",
    "- Do NOT repeat the same observation across multiple fields.",
    "",
    "Output constraints (tight + non-redundant):",
    "",
    "- fitSummary: REQUIRED. 2–3 sentences. An honest overall narrative — biggest alignments,",
    "  biggest blockers, and what would most raise the score. Written in second-person. No JD quoting.",
    "",
    "- strengths: max 7 items. The candidate's strongest alignments with this specific role.",
    "  - Format: '<Topic> — <1–2 sentences describing evidence-backed alignment> (Evidence: \"<snippet>\").'",
    "  - Empty array only if there is genuinely no alignment to speak of.",
    "",
    "- gaps: max 7 items. Shortfalls, missing requirements, and risk areas relative to this JD.",
    "  This covers both hard mismatches (missing skills) and softer risks (level mismatch, scope gap).",
    "  - Format: '<Gap> — You do not show explicit evidence of <requirement>. Fast path: <quick action>.'",
    "  - Only include gaps grounded in the JD's actual requirements or constraints.",
    "  - Empty array if the candidate is a strong match with no meaningful gaps.",
    "",
    "- roleSignals: max 5 items. What this JD is actually prioritising — the things that matter most.",
    "  Help the candidate understand what the hiring team is really looking for so they can weight",
    "  their own read of the strengths/gaps. Derived from the JD, not the candidate text.",
    "  - Format: '<Signal> — <why this seems important based on the JD>.'",
    "  - Empty array if the JD is too vague to extract meaningful signals.",
    "",
    "- prepAreas: max 6 items. Skills, tools, or concepts worth brushing up on before pursuing this role.",
    "  Distinct from gaps (which is about the resume record) — this is about what to study or review.",
    "  - Only include prep areas that are plausibly within reach for this candidate.",
    "  - Empty array if the candidate appears well-prepared already.",
    "",
    "Avoid repetition across fields. If something appears in gaps, don't restate it in strengths.",
    "If there is insufficient text to evaluate, return score=0, fitSummary explaining what was missing, and empty arrays.",
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

type ParseJsonSchemaOptions = {
  /** Prefer this over generic AI_REFUSED when the API returns incomplete + content_filter */
  onContentFilter?: { message: string; code: string; statusCode: number };
};


/**
 * Parse the response from the AI request and throw an error if the response is invalid.
 */
function parseJsonSchemaOutputOrThrow<T>(resp: any, ctx: AiParseContext, options?: ParseJsonSchemaOptions): T {
  
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
    if (
      options?.onContentFilter &&
      debug.incompleteReason === "content_filter" &&
      !refusal
    ) {
      throw new AppError(
        options.onContentFilter.message,
        options.onContentFilter.statusCode,
        options.onContentFilter.code
      );
    }
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