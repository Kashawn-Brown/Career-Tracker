/**
 * artifact-interactions.service.ts
 *
 * Records artifact interactions (viewed, copied, regenerated) so we can
 * measure whether generated outputs are actually being used.
 *
 * "Generated" and "valuable" are not the same thing. If users run tools
 * and never return to the outputs, that is a product signal worth knowing.
 *
 * Design rules:
 *   - Never throws — interaction tracking must not break artifact reads
 *   - Exactly one of userArtifactId or applicationArtifactId should be set
 *   - Keep scope/kind denormalized on the row so queries stay fast
 */

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtifactInteractionType = "VIEWED" | "COPIED" | "REGENERATED";
export type ArtifactScope           = "GENERIC" | "TARGETED";

export type TrackArtifactInteractionArgs = {
  userId:        string;
  applicationId?: string | null;
  // Exactly one of these should be provided
  userArtifactId?:        string | null;
  applicationArtifactId?: string | null;
  interactionType: ArtifactInteractionType;
  artifactKind:    string;   // e.g. "RESUME_ADVICE", "FIT_V1", "INTERVIEW_PREP"
  scope:           ArtifactScope;
  metadata?:       Record<string, unknown> | null;
};


// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Records that a user interacted with an AI artifact.
 * Fire-and-forget — always resolves, never throws.
 */
export async function trackArtifactInteraction(
  args: TrackArtifactInteractionArgs,
): Promise<void> {
  try {
    await prisma.artifactInteraction.create({
      data: {
        userId:               args.userId,
        applicationId:        args.applicationId        ?? null,
        userArtifactId:       args.userArtifactId       ?? null,
        applicationArtifactId: args.applicationArtifactId ?? null,
        interactionType:      args.interactionType,
        artifactKind:         args.artifactKind,
        scope:                args.scope,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn(
      "[artifact-interactions] trackArtifactInteraction failed:",
      (err as Error)?.message ?? err,
    );
  }
}

/**
 * Convenience helper for recording that a user opened/viewed a targeted
 * application artifact (e.g. opened the Fit report or Resume Advice panel).
 */
export async function trackApplicationArtifactViewed(args: {
  userId:               string;
  applicationId:        string;
  applicationArtifactId: string;
  artifactKind:         string;
}): Promise<void> {
  await trackArtifactInteraction({
    userId:               args.userId,
    applicationId:        args.applicationId,
    applicationArtifactId: args.applicationArtifactId,
    interactionType:      "VIEWED",
    artifactKind:         args.artifactKind,
    scope:                "TARGETED",
  });
}

/**
 * Convenience helper for recording that a user viewed a generic (Tools page)
 * artifact — either the current result or a past run.
 */
export async function trackUserArtifactViewed(args: {
  userId:        string;
  userArtifactId: string;
  artifactKind:  string;
}): Promise<void> {
  await trackArtifactInteraction({
    userId:         args.userId,
    userArtifactId: args.userArtifactId,
    interactionType: "VIEWED",
    artifactKind:   args.artifactKind,
    scope:          "GENERIC",
  });
}