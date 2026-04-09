/**
 * user-ai-artifacts.service.ts
 *
 * Service layer for UserAiArtifact — user-scoped AI results from generic
 * document tools (resume advice, cover letter, interview prep) that are not
 * tied to a specific job application.
 *
 * Key behavior:
 * - Capped at MAX_PER_KIND (3) artifacts per user per tool kind.
 * - When the cap is reached, the oldest is deleted before creating the new one.
 * - Users can also manually delete any artifact.
 * - When an artifact is deleted (manually or by eviction), any associated
 *   uploaded resume document (kind = CAREER_HISTORY) is also cleaned up
 *   from both the DB and GCS to prevent orphaned storage.
 */

import { prisma }     from "../../lib/prisma.js";
import { AppError }   from "../../errors/app-error.js";
import { deleteGcsObject } from "../../lib/storage.js";
import { DocumentKind } from "@prisma/client";

// Max stored results per user per tool kind.
// When exceeded, the oldest is auto-deleted before inserting the new one.
const MAX_PER_KIND = 3;

export type ResumeSource = "BASE_RESUME" | "UPLOAD";

export type CreateUserAiArtifactInput = {
  userId:            string;
  kind:              string;
  payload:           object;
  model:             string;
  resumeSource:      ResumeSource;
  sourceDocumentId?: number | null;
};

/**
 * Cleans up the uploaded resume document associated with a UserAiArtifact,
 * if one exists and is of kind CAREER_HISTORY (i.e. it was uploaded just
 * for this tool run, not a permanent base resume).
 *
 * Called on both manual deletion and cap-based eviction to prevent
 * orphaned DB rows and GCS files accumulating over time.
 */
async function cleanupSourceDocument(
  sourceDocumentId: number | null,
  excludeArtifactId?: string,
) {
  if (!sourceDocumentId) return;

  try {
    const doc = await prisma.document.findUnique({
      where:  { id: sourceDocumentId },
      select: { id: true, kind: true, storageKey: true },
    });

    // Only delete CAREER_HISTORY docs — these are ephemeral per-run uploads.
    // BASE_RESUME and other permanent kinds must never be touched here.
    if (!doc || doc.kind !== DocumentKind.CAREER_HISTORY) return;

    // Reference count guard: if any other UserAiArtifact still points at this
    // document (e.g. a user re-used the same upload across multiple tool runs),
    // skip the delete — the document is still in use.
    const stillReferenced = await prisma.userAiArtifact.count({
      where: {
        sourceDocumentId,
        ...(excludeArtifactId ? { id: { not: excludeArtifactId } } : {}),
      },
    });

    if (stillReferenced > 0) return;

    await prisma.document.delete({ where: { id: doc.id } });
    await deleteGcsObject(doc.storageKey).catch(() => {
      // Non-fatal: log but don't surface — the DB row is already gone
      console.warn(`[user-ai-artifacts] GCS cleanup failed for storageKey=${doc.storageKey}`);
    });
  } catch {
    // Non-fatal: best-effort cleanup, don't block artifact creation or deletion
    console.warn(`[user-ai-artifacts] Source document cleanup failed for id=${sourceDocumentId}`);
  }
}

/**
 * Creates a new UserAiArtifact for the given user and kind.
 *
 * Enforces the per-kind cap by deleting the oldest artifact(s) before
 * creating the new one if the user is already at the limit. Uploaded
 * resume documents linked to evicted artifacts are also cleaned up.
 */
export async function createUserAiArtifact(input: CreateUserAiArtifactInput) {
  const { userId, kind, payload, model, resumeSource, sourceDocumentId } = input;

  // Count existing artifacts for this user + kind
  const existing = await prisma.userAiArtifact.findMany({
    where:   { userId, kind },
    orderBy: { createdAt: "asc" },
    select:  { id: true, sourceDocumentId: true },
  });

  // If at or over cap, delete oldest to make room and clean up their source docs
  if (existing.length >= MAX_PER_KIND) {
    const toEvict = existing.slice(0, existing.length - MAX_PER_KIND + 1);

    await prisma.userAiArtifact.deleteMany({
      where: { id: { in: toEvict.map((a) => a.id) } },
    });

    // Clean up uploaded resume docs for each evicted artifact
    for (const evicted of toEvict) {
      await cleanupSourceDocument(evicted.sourceDocumentId);
    }
  }

  return prisma.userAiArtifact.create({
    data: {
      userId,
      kind,
      payload,
      model,
      resumeSource,
      sourceDocumentId: sourceDocumentId ?? null,
    },
  });
}

/**
 * Lists UserAiArtifacts for a user, optionally filtered by kind.
 * Returns newest first.
 */
export async function listUserAiArtifacts(args: {
  userId: string;
  kind?:  string;
}) {
  return prisma.userAiArtifact.findMany({
    where:   { userId: args.userId, ...(args.kind ? { kind: args.kind } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Deletes a UserAiArtifact by id, scoped to the user.
 * Also cleans up any uploaded resume document tied to this artifact.
 * Throws 404 if not found or not owned by the user.
 */
export async function deleteUserAiArtifact(userId: string, artifactId: string) {
  const artifact = await prisma.userAiArtifact.findUnique({
    where:  { id: artifactId },
    select: { id: true, userId: true, sourceDocumentId: true },
  });

  if (!artifact || artifact.userId !== userId) {
    throw new AppError("Artifact not found.", 404, "USER_AI_ARTIFACT_NOT_FOUND");
  }

  await prisma.userAiArtifact.delete({ where: { id: artifactId } });

  // Clean up the uploaded resume document if one was used for this run.
  // Pass the artifact id so the reference check correctly excludes the
  // row we just deleted (it no longer exists in the DB at this point,
  // but passing it is harmless and makes intent explicit).
  await cleanupSourceDocument(artifact.sourceDocumentId, artifactId);
}