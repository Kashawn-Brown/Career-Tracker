/**
 * analytics-tracker.ts
 *
 * Fire-and-forget helper for recording major product events.
 *
 * Design rules:
 *   - NEVER throws — a tracking failure must never break the primary user flow
 *   - Snapshots plan and role at event time (users may change plan later)
 *   - Keeps metadata lightweight — small contextual details only
 *   - Not a clickstream; only meaningful product actions belong here
 */

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";

// ─── Event catalog ────────────────────────────────────────────────────────────

export type ProductEventCategory =
  | "APPLICATION"
  | "AI"
  | "ARTIFACT"
  | "EXPORT"
  | "AUTH"
  | "ADMIN";

export type ProductEventType =
  // Application lifecycle
  | "APPLICATION_CREATED"
  | "APPLICATION_UPDATED"
  | "APPLICATION_DELETED"
  // JD extraction
  | "JD_EXTRACTION_STARTED"
  | "JD_EXTRACTION_SUCCEEDED"
  | "JD_EXTRACTION_FAILED"
  // AI tool runs (mirrors AiRun status for cross-querying)
  | "AI_RUN_STARTED"
  | "AI_RUN_SUCCEEDED"
  | "AI_RUN_FAILED"
  // Artifact interactions
  | "ARTIFACT_VIEWED"
  | "ARTIFACT_COPIED"
  | "ARTIFACT_REGENERATED"
  // Export
  | "APPLICATIONS_CSV_EXPORTED";

export type TrackEventArgs = {
  userId?:        string | null;
  applicationId?: string | null;
  eventType:      ProductEventType;
  category:       ProductEventCategory;
  surface?:       string | null;
  planAtTime?:    string | null;
  roleAtTime?:    string | null;
  metadata?:      Record<string, unknown> | null;
};


// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Records a product event. Always resolves — failures are logged and swallowed
 * so tracking never blocks or crashes the primary user flow.
 */
export async function trackEvent(args: TrackEventArgs): Promise<void> {
  try {
    await prisma.productEvent.create({
      data: {
        userId:        args.userId        ?? null,
        applicationId: args.applicationId ?? null,
        eventType:     args.eventType,
        category:      args.category,
        surface:       args.surface       ?? null,
        planAtTime:    args.planAtTime    ?? null,
        roleAtTime:    args.roleAtTime    ?? null,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Non-fatal: log but never surface to the caller
    console.warn("[analytics] trackEvent failed:", (err as Error)?.message ?? err);
  }
}

/**
 * Convenience wrapper that fetches the user's current plan and role before
 * recording the event, so callers don't need to pass them explicitly.
 */
export async function trackEventForUser(
  userId: string,
  args: Omit<TrackEventArgs, "userId" | "planAtTime" | "roleAtTime">
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { plan: true, role: true },
    });

    await trackEvent({
      ...args,
      userId,
      planAtTime: user?.plan ?? null,
      roleAtTime: user?.role ?? null,
    });
  } catch (err) {
    console.warn("[analytics] trackEventForUser failed:", (err as Error)?.message ?? err);
  }
}