import { ApplicationStatus, JobType, WorkMode, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { applicationSelect, applicationConnectionSelect, applicationListSelect } from "./applications.dto.js";
import type { CreateApplicationInput, UpdateApplicationInput, ListApplicationsParams } from "./applications.dto.js";
import type { AiArtifactKindType } from "./applications.schemas.js";


/**
 * Service layer:
 * - Convert request-friendly values into DB-friendly values (ex: string -> Date)
 * - Enforce DB/query logic
 * - Keep Prisma usage out of the HTTP route handlers
 */


/**
 * Creates a new Application for the current user.
 */
export async function createApplication(input: CreateApplicationInput) {
  return prisma.jobApplication.create({
    data: {
      userId: input.userId,
      company: input.company,
      position: input.position,
      isFavorite: input.isFavorite ?? false,

      location: normalizeNullableString(input.location),
      locationDetails: normalizeNullableString(input.locationDetails),

      jobType: input.jobType ?? JobType.UNKNOWN,
      jobTypeDetails: normalizeNullableString(input.jobTypeDetails),
      workMode: input.workMode ?? WorkMode.UNKNOWN,
      workModeDetails: normalizeNullableString(input.workModeDetails),
      salaryText: normalizeNullableString(input.salaryText),

      // Default status if not provided
      status: input.status ?? ApplicationStatus.APPLIED,

      // Convert ISO string -> Date for Postgres
      dateApplied: input.dateApplied ? new Date(input.dateApplied) : null,

      jobLink: normalizeNullableString(input.jobLink),
      description: normalizeNullableString(input.description),
      notes: normalizeNullableString(input.notes),
      tagsText: normalizeNullableString(input.tagsText),

    },
    select: applicationSelect,
  });
}


/**
 * Lists the current users applications. 
 * Supports pagination + sorting + filtering.
 */
export async function listApplications(params: ListApplicationsParams) {

  // Build Pagination
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const sortBy = params.sortBy ?? "updatedAt";
  const sortDir = params.sortDir ?? "desc";

  // Build a typed Prisma where-clause so TS can validate our query shape.
  const where: Prisma.JobApplicationWhereInput = { userId: params.userId };

  // Optional filters
  if (params.status) where.status = params.status;

  if (params.jobType) where.jobType = params.jobType;
  if (params.workMode) where.workMode = params.workMode;
  if (params.isFavorite !== undefined) where.isFavorite = params.isFavorite;

  // Basic text search across company and position
  if (params.q) {
    where.OR = [
      { company: { contains: params.q, mode: "insensitive" } },
      { position: { contains: params.q, mode: "insensitive" } },
    ];
  }

  // Fit score filters
  const fitMin = params.fitMin ?? 0;
  const fitMax = params.fitMax ?? 100;
  
  // Only add fit score filter if it's not the default (0-100)
  const hasFitFilter = (params.fitMin !== undefined || params.fitMax !== undefined) && !(fitMin === 0 && fitMax === 100);

  if (hasFitFilter) {
    if (fitMin > fitMax) {
      throw new AppError("Fit score range is invalid.", 400);
    }

    // Add the fit score filter (excludes null values)
    where.fitScore = { gte: fitMin, lte: fitMax };
  }

  

  // how many rows to ignore/skip (page 1, size 20 = skip 0; page 2, size 20 = skip 20; etc.)
  const skip = (page - 1) * pageSize;

  // Run both queries in a transaction so count + items are consistent
  const [total, items] = await prisma.$transaction([
    prisma.jobApplication.count({ where }),  // total count of the matching rows
    
    prisma.jobApplication.findMany({  // items for the current page
      where,
      orderBy: sortBy !== "fitScore" ?[{ [sortBy]: sortDir }, { updatedAt: "desc" }] : [{fitScore: {sort: sortDir, nulls: "last"}}, {updatedAt: "desc"}],   // null scores always bottom for fit score sorting
      skip,
      take: pageSize,  // how many rows to take/return
      select: applicationListSelect,
    }),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}


/**
 * Fetch a single application for the current user.
 */
export async function getApplicationById(userId: string, id: string) {
  const app = await prisma.jobApplication.findFirst({
    where: { id, userId },
    select: applicationSelect,
  });

  if (!app) throw new AppError("Application not found", 404);
  return app;
}


/**
 * Partial update of an application that belongs to the current user.
 */
export async function updateApplication(
  userId: string,
  id: string,
  input: UpdateApplicationInput
) {
  // Wrap in transaction so the "read current state" + "write update" are consistent
  return prisma.$transaction(async (db: Prisma.TransactionClient) => {
    const current = await db.jobApplication.findFirst({
      where: { id, userId },
      select: { status: true, dateApplied: true },
    });

    if (!current) {
      throw new AppError("Application not found", 404);
    }

    // Build the data object to update the application
    const data: any = {};

    // Only apply fields that were actually provided by the client (PATCH semantics)
    if (input.company !== undefined) data.company = input.company;
    if (input.position !== undefined) data.position = input.position;

    if (input.status !== undefined) data.status = input.status;

    // Check if the status is being transitioned to applied
    const TransitionToApplied = input.status === ApplicationStatus.APPLIED && current.status !== ApplicationStatus.APPLIED;

    // Track if client explicitly provided dateApplied
    const inputDateApplied = input.dateApplied !== undefined;

    // If the status is being transitioned to applied and the client did not explicitly provide a dateApplied, auto-fill the dateApplied
    if (TransitionToApplied && !inputDateApplied && current.dateApplied === null) {
      // Auto-fill only once; never overwrite existing applied date
      data.dateApplied = new Date();
    }

    // Convert ISO string -> Date for Prisma (explicit client value wins)
    if (input.dateApplied !== undefined) {
      data.dateApplied = input.dateApplied ? new Date(input.dateApplied) : null;
    }

    if (input.location !== undefined) data.location = normalizeNullableString(input.location);
    if (input.locationDetails !== undefined) data.locationDetails = normalizeNullableString(input.locationDetails);

    if (input.jobType !== undefined) data.jobType = input.jobType;
    if (input.jobTypeDetails !== undefined) data.jobTypeDetails = normalizeNullableString(input.jobTypeDetails);

    if (input.workMode !== undefined) data.workMode = input.workMode;
    if (input.workModeDetails !== undefined) data.workModeDetails = normalizeNullableString(input.workModeDetails);

    if (input.salaryText !== undefined) {
      data.salaryText = normalizeNullableString(input.salaryText);
    }

    if (input.isFavorite !== undefined) data.isFavorite = input.isFavorite;

    if (input.jobLink !== undefined) data.jobLink = normalizeNullableString(input.jobLink);
    if (input.description !== undefined) data.description = normalizeNullableString(input.description);
    if (input.notes !== undefined) data.notes = normalizeNullableString(input.notes);
    if (input.tagsText !== undefined) data.tagsText = normalizeNullableString(input.tagsText);

    const result = await db.jobApplication.updateMany({
      where: { id, userId },
      data,
    });

    if (result.count === 0) {
      throw new AppError("Application not found", 404);
    }

    // Return the updated application
    return db.jobApplication.findFirst({
      where: { id, userId },
      select: applicationSelect,
    });
  });
}

/**
 * Delete an application that belongs to the current user.
 */
export async function deleteApplication(userId: string, id: string) {
  // Use deleteMany to include userId in filter (prevents leaking)
  const result = await prisma.jobApplication.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new AppError("Application not found", 404);
  }

  return { ok: true };
}


//----------------- CONNECTIONS -----------------

/**
 * Lists the connections for an application.
 */
export async function listApplicationConnections(userId: string, applicationId: string) {
  // Ensure application belongs to user
  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });

  if (!app) throw new AppError("Application not found", 404);

  const items = await prisma.applicationConnection.findMany({
    where: { jobApplicationId: applicationId },
    orderBy: { createdAt: "desc" },
    select: applicationConnectionSelect,
  });

  // Flatten to { ...connection, attachedAt }
  return items.map((row) => ({
    ...row.connection,
    attachedAt: row.createdAt,
  }));
}

/**
 * Attaches a connection to an application.
 */
export async function attachConnectionToApplication(
  userId: string,
  applicationId: string,
  connectionId: string
) {
  // Validate both belong to user
  const [app, conn] = await prisma.$transaction([
    prisma.jobApplication.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    }),
    prisma.connection.findFirst({
      where: { id: connectionId, userId },
      select: { id: true },
    }),
  ]);

  if (!app) throw new AppError("Application not found", 404);
  if (!conn) throw new AppError("Connection not found", 404);

  await prisma.$transaction(async (db) => {
    await db.applicationConnection.upsert({
      where: {
        jobApplicationId_connectionId: {
          jobApplicationId: applicationId,
          connectionId,
        },
      },
      update: {},
      create: {
        jobApplicationId: applicationId,
        connectionId,
      },
    });

    // Keeps table “recent activity” consistent (same reason as documents).
    await db.jobApplication.update({
      where: { id: applicationId },
      data: { updatedAt: new Date() }, // explicit touch
    });
  });

  return { ok: true };
}

/**
 * Detaches a connection from an application.
 */
export async function detachConnectionFromApplication(
  userId: string,
  applicationId: string,
  connectionId: string
) {
  // Validate application belongs to user (connection is validated via join delete)
  const app = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });

  if (!app) throw new AppError("Application not found", 404);

  await prisma.$transaction(async (db) => {
    await db.applicationConnection.deleteMany({
      where: { jobApplicationId: applicationId, connectionId },
    });

    await db.jobApplication.update({
      where: { id: applicationId },
      data: { updatedAt: new Date() }, // explicit touch
    });
  });

  return { ok: true };
}


//----------------- AI ARTIFACTS -----------------

// AI artifacts are used to store the results of AI-generated content.

/**
 * Creates a new AI artifact for an application.
 */
export async function createAiArtifact(args: {
  userId: string;
  jobApplicationId: string;
  kind: AiArtifactKindType;
  payload: unknown;
  model: string;
  sourceDocumentId?: number;
}) {
  // Keeping all versions for now
  // // Keep only 1 (most recent) artifact per kind per application.
  // return prisma.$transaction(async (db) => {
    
  //   // Delete all existing artifacts for this kind and application.
  //   await db.aiArtifact.deleteMany({
  //     where: {
  //       userId: args.userId,
  //       jobApplicationId: args.jobApplicationId,
  //       kind: args.kind,
  //     },
  //   });

  //   return db.aiArtifact.create({
  //     data: {
  //       userId: args.userId,
  //       jobApplicationId: args.jobApplicationId,
  //       kind: args.kind,
  //       payload: args.payload as any,
  //       model: args.model,
  //     },
  //   });
  // });
  
  // Run in a transaction to ensure consistency
  return prisma.$transaction(async (db) => {
    
    // Create the AI artifact
    const artifact = await db.aiArtifact.create({
      data: {
        userId: args.userId,
        jobApplicationId: args.jobApplicationId,
        kind: args.kind,
        payload: args.payload as any,
        model: args.model,
        sourceDocumentId: args.sourceDocumentId ?? null,
      },
    });

    // If it's a FIT artifact, persist the latest score onto the application
    if (args.kind === "FIT_V1") {
      const score = extractFitScore(args.payload);

      if (score !== null) {
        await db.jobApplication.updateMany({
          where: { id: args.jobApplicationId, userId: args.userId },
          data: {
            fitScore: score,
            fitUpdatedAt: new Date(),
          },
        });
      }
    }

    // Return the AI artifact
    return artifact;
  });
}

/**
 * Lists the AI artifacts for an application.
 */
export async function listAiArtifacts(args: {
  userId: string;
  jobApplicationId: string;
  kind?: AiArtifactKindType; // Type of AI artifact
  all?: boolean; // when true, return full history of artifacts for this kind and application
}) {
  // Ensures the application exists + belongs to the user
  await getApplicationById(args.userId, args.jobApplicationId);

  return prisma.aiArtifact.findMany({
    where: {
      userId: args.userId,
      jobApplicationId: args.jobApplicationId,
      ...(args.kind ? { kind: args.kind } : {}),  // Optional filter by kind (can send multiple kinds to list multiple artifacts (later))
    },
    orderBy: { createdAt: "desc" },
    take: args.all ? undefined : 1, // Default: return latest only
  });
}


//----------------- HELPER FUNCTIONS -----------------

// Helper to normalize nullable string fields
const normalizeNullableString = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

// Helper to extract the fit score from the payload
function extractFitScore(payload: unknown): number | null {
  const score = (payload as any)?.score;

  if (typeof score !== "number" || Number.isNaN(score)) return null;

  // Clamp to 0–100 and round to an int for DB storage
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(clamped);
}
