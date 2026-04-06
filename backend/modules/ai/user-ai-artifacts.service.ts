/**
 * user-ai-artifacts.service.ts
 *
 * Service layer for UserAiArtifact — user-scoped AI results from generic
 * document tools (resume advice, cover letter) that are not tied to a
 * specific job application.
 *
 * Key behavior:
 * - Capped at MAX_PER_KIND (3) artifacts per user per tool kind.
 * - When the cap is reached, the oldest is deleted before creating the new one.
 * - Users can also manually delete any artifact.
 */

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";

// Max stored results per user per tool kind (resume advice, cover letter).
// When exceeded, the oldest is auto-deleted before inserting the new one.
const MAX_PER_KIND = 3;

export type ResumeSource = "BASE_RESUME" | "UPLOAD";

export type CreateUserAiArtifactInput = {
  userId:           string;
  kind:             string;
  payload:          object;
  model:            string;
  resumeSource:     ResumeSource;
  sourceDocumentId?: number | null;
};

/**
 * Creates a new UserAiArtifact for the given user and kind.
 *
 * Enforces the per-kind cap by deleting the oldest artifact before
 * creating the new one if the user is already at the limit.
 */
export async function createUserAiArtifact(input: CreateUserAiArtifactInput) {
  const { userId, kind, payload, model, resumeSource, sourceDocumentId } = input;

  // Count existing artifacts for this user + kind
  const existing = await prisma.userAiArtifact.findMany({
    where:   { userId, kind },
    orderBy: { createdAt: "asc" },
    select:  { id: true },
  });

  // If at or over cap, delete oldest to make room
  if (existing.length >= MAX_PER_KIND) {
    const toDelete = existing.slice(0, existing.length - MAX_PER_KIND + 1);
    await prisma.userAiArtifact.deleteMany({
      where: { id: { in: toDelete.map((a) => a.id) } },
    });
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
 * Throws 404 if not found or not owned by the user.
 */
export async function deleteUserAiArtifact(userId: string, artifactId: string) {
  const artifact = await prisma.userAiArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact || artifact.userId !== userId) {
    throw new AppError("Artifact not found.", 404, "USER_AI_ARTIFACT_NOT_FOUND");
  }

  await prisma.userAiArtifact.delete({ where: { id: artifactId } });
}