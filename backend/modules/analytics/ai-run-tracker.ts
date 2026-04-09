/**
 * ai-run-tracker.ts
 *
 * Centralized helper for tracking the full lifecycle of AI tool runs.
 *
 * Every major AI invocation should:
 *   1. Call startAiRun() before the AI call → returns a runId
 *   2. Call succeedAiRun(runId, ...) on success
 *   3. Call failAiRun(runId, ...) on failure
 *
 * This keeps tracking consistent across all AI routes/services without
 * duplicating logic. Failures in tracking are non-fatal and logged only.
 */

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiToolKind =
  | "JD_EXTRACTION"
  | "FIT"
  | "RESUME_HELP"
  | "COVER_LETTER_HELP"
  | "RESUME_ADVICE"
  | "COVER_LETTER"
  | "INTERVIEW_PREP";

export type AiRunScope         = "GENERIC" | "TARGETED" | "EXTRACTION";
export type AiRunTriggerSource = "TOOLS_PAGE" | "APPLICATION_DRAWER" | "CREATE_FLOW" | "SYSTEM";
export type AiResumeMode       = "NONE" | "BASE" | "ATTACHED" | "UPLOADED_OVERRIDE";
export type AiJdMode           = "NONE" | "PASTED" | "LINK" | "APPLICATION_DESCRIPTION";

/** Categorises errors into readable buckets for admin failure analytics. */
export type AiErrorCategory =
  | "AUTH"
  | "VALIDATION"
  | "MODEL_PROVIDER"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PARSING"
  | "PERSISTENCE"
  | "UNKNOWN";

export type StartAiRunArgs = {
  userId:        string;
  applicationId?: string | null;
  toolKind:       AiToolKind;
  scope:          AiRunScope;
  triggerSource:  AiRunTriggerSource;
  provider?:      string | null;
  model?:         string | null;
  resumeMode?:    AiResumeMode | null;
  jdMode?:        AiJdMode | null;
  // Caller can pass plan/role directly to avoid a second DB round-trip
  planAtTime?:    string | null;
  roleAtTime?:    string | null;
  metadata?:      Record<string, unknown> | null;
};

export type SucceedAiRunArgs = {
  runId:                  string | null;
  // Linked artifact IDs — set when a persisted artifact was created
  userArtifactId?:        string | null;
  applicationArtifactId?: string | null;
  // Sizing
  inputChars?:  number | null;
  outputChars?: number | null;
  // Token counts — populated when the provider returns them
  promptTokens?:     number | null;
  completionTokens?: number | null;
  totalTokens?:      number | null;
  metadata?:         Record<string, unknown> | null;
};

export type FailAiRunArgs = {
  runId:        string | null;
  error:        unknown;           // raw caught error
  errorCode?:   string | null;
  metadata?:    Record<string, unknown> | null;
};


// ─── Cost estimation ──────────────────────────────────────────────────────────

/**
 * Cost per 1k tokens in USD for known models.
 * Intentionally conservative and nullable — we return null rather than guess.
 * Update as OpenAI pricing changes.
 */
const MODEL_COSTS: Record<string, { inputPer1k: number; outputPer1k: number } | undefined> = {
  "gpt-5-mini":      { inputPer1k: 0.00015, outputPer1k: 0.0006  },
  "gpt-4o":          { inputPer1k: 0.005,   outputPer1k: 0.015   },
  "gpt-4o-mini":     { inputPer1k: 0.00015, outputPer1k: 0.0006  },
  "gpt-4-turbo":     { inputPer1k: 0.01,    outputPer1k: 0.03    },
};

function estimateCost(
  model: string | null | undefined,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined,
): string | null {
  if (!model || !promptTokens || !completionTokens) return null;
  const pricing = MODEL_COSTS[model];
  if (!pricing) return null;

  const cost =
    (promptTokens    / 1000) * pricing.inputPer1k  +
    (completionTokens / 1000) * pricing.outputPer1k;

  // Return as a string to avoid floating point precision issues in the DB
  return cost.toFixed(8);
}


// ─── Error categorisation ─────────────────────────────────────────────────────

/**
 * Maps a caught error to a readable category for admin failure analytics.
 * Never throws — returns "UNKNOWN" if nothing matches.
 */
function categoriseError(err: unknown): AiErrorCategory {
  if (!(err instanceof Error)) return "UNKNOWN";

  const code    = (err as AppError).code ?? "";
  const message = err.message?.toLowerCase() ?? "";

  if (code === "EMAIL_NOT_VERIFIED" || code === "MISSING_BEARER") return "AUTH";
  if (code === "AI_QUOTA_EXCEEDED")                                return "RATE_LIMIT";
  if (code === "JD_CONTENT_FILTER" || code === "AI_REFUSED")      return "MODEL_PROVIDER";
  if (code === "AI_INVALID_JSON" || code === "AI_EMPTY_OUTPUT")    return "PARSING";
  if (message.includes("timeout") || message.includes("timed out")) return "TIMEOUT";
  if (message.includes("rate limit") || message.includes("429"))    return "RATE_LIMIT";
  if (message.includes("prisma") || message.includes("database"))   return "PERSISTENCE";
  if (
    code?.startsWith("JOB_DESCRIPTION") ||
    code?.startsWith("RESUME_TEXT") ||
    code?.startsWith("CANDIDATE")
  ) return "VALIDATION";

  return "UNKNOWN";
}


// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Creates an AiRun record with status STARTED.
 * Returns the new run's id so the caller can update it on success/failure.
 * Returns null on failure so callers can safely call succeed/fail with null.
 */
export async function startAiRun(args: StartAiRunArgs): Promise<string | null> {
  try {
    // Fetch plan/role if not supplied by caller
    let planAtTime = args.planAtTime ?? null;
    let roleAtTime = args.roleAtTime ?? null;

    if ((!planAtTime || !roleAtTime) && args.userId) {
      const user = await prisma.user.findUnique({
        where:  { id: args.userId },
        select: { plan: true, role: true },
      });
      planAtTime = planAtTime ?? user?.plan ?? null;
      roleAtTime = roleAtTime ?? user?.role ?? null;
    }

    const run = await prisma.aiRun.create({
      data: {
        userId:        args.userId,
        applicationId: args.applicationId ?? null,
        toolKind:      args.toolKind,
        scope:         args.scope,
        triggerSource: args.triggerSource,
        provider:      args.provider      ?? null,
        model:         args.model         ?? null,
        status:        "STARTED",
        resumeMode:    args.resumeMode    ?? null,
        jdMode:        args.jdMode        ?? null,
        planAtTime,
        roleAtTime,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        startedAt:     new Date(),
      },
      select: { id: true },
    });

    return run.id;
  } catch (err) {
    console.warn("[ai-run-tracker] startAiRun failed:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * Marks an AiRun as SUCCEEDED with timing, token usage, and artifact links.
 * Safe to call with a null runId (tracking was skipped on start).
 */
export async function succeedAiRun(args: SucceedAiRunArgs): Promise<void> {
  if (!args.runId) return;

  try {
    // Fetch the model stored on the run so we can estimate cost
    const existing = await prisma.aiRun.findUnique({
      where:  { id: args.runId },
      select: { model: true, startedAt: true },
    });

    const now        = new Date();
    const durationMs = existing?.startedAt
      ? now.getTime() - existing.startedAt.getTime()
      : null;

    const estimatedCostUsd = estimateCost(
      existing?.model,
      args.promptTokens,
      args.completionTokens,
    );

    await prisma.aiRun.update({
      where: { id: args.runId },
      data: {
        status:                 "SUCCEEDED",
        completedAt:            now,
        durationMs,
        userArtifactId:         args.userArtifactId        ?? null,
        applicationArtifactId:  args.applicationArtifactId ?? null,
        inputChars:             args.inputChars             ?? null,
        outputChars:            args.outputChars            ?? null,
        promptTokens:           args.promptTokens           ?? null,
        completionTokens:       args.completionTokens       ?? null,
        totalTokens:            args.totalTokens            ?? null,
        estimatedCostUsd,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn("[ai-run-tracker] succeedAiRun failed:", (err as Error)?.message ?? err);
  }
}

/**
 * Marks an AiRun as FAILED with categorised error details and timing.
 * Safe to call with a null runId.
 */
export async function failAiRun(args: FailAiRunArgs): Promise<void> {
  if (!args.runId) return;

  try {
    const existing = await prisma.aiRun.findUnique({
      where:  { id: args.runId },
      select: { startedAt: true },
    });

    const now        = new Date();
    const durationMs = existing?.startedAt
      ? now.getTime() - existing.startedAt.getTime()
      : null;

    const appError     = args.error instanceof AppError ? args.error : null;
    const errorCode    = args.errorCode ?? appError?.code ?? null;
    const errorMessage = args.error instanceof Error ? args.error.message : String(args.error);
    const errorCategory = categoriseError(args.error);

    await prisma.aiRun.update({
      where: { id: args.runId },
      data: {
        status:        "FAILED",
        completedAt:   now,
        durationMs,
        errorCode,
        errorMessage,
        errorCategory,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn("[ai-run-tracker] failAiRun failed:", (err as Error)?.message ?? err);
  }
}