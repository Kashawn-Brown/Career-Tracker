import { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";

/**
 * Service layer:
 * - Convert request-friendly values into DB-friendly values (ex: string -> Date)
 * - Enforce DB/query logic
 * - Keep Prisma usage out of the HTTP route handlers
 */


type CreateApplicationInput = {
  userId: string;
  company: string;
  position: string;
  status?: ApplicationStatus;
  dateApplied?: string;
  jobLink?: string;
  description?: string;
  notes?: string;
};

export async function createApplication(input: CreateApplicationInput) {
  return prisma.jobApplication.create({
    data: {
      userId: input.userId,
      company: input.company,
      position: input.position,

      // Default status if not provided
      status: input.status ?? ApplicationStatus.APPLIED,

      // Convert ISO string -> Date for Postgres
      dateApplied: input.dateApplied ? new Date(input.dateApplied) : null,

      jobLink: input.jobLink,
      description: input.description,
      notes: input.notes,
    },
  });
}

export async function listApplications(params: {
  userId: string;
  status?: ApplicationStatus;
  q?: string;
}) {
  // Build a typed Prisma where-clause so TS can validate our query shape.
  const where: Prisma.JobApplicationWhereInput = { userId: params.userId };

  // Optional filters
  if (params.status) where.status = params.status;

  // Basic text search across company and position
  if (params.q) {
    where.OR = [
      { company: { contains: params.q, mode: "insensitive" } },
      { position: { contains: params.q, mode: "insensitive" } },
    ];
  }

  return prisma.jobApplication.findMany({
    where,
    // Most recently updated first
    orderBy: { updatedAt: "desc" },
  });
}


/**
 * Fetch one application for the current user.
 * Include userId in the filter so users can't access someone else's data.
 */
export async function getApplicationById(userId: string, id: string) {
  const app = await prisma.jobApplication.findFirst({
    where: { id, userId },
  });

  if (!app) throw new AppError("Application not found", 404);
  return app;
}


type UpdateApplicationInput = {
  company?: string;
  position?: string;
  status?: ApplicationStatus;
  dateApplied?: string;
  jobLink?: string;
  description?: string;
  notes?: string;
};

/**
 * Partial update of an application that belongs to the current user.
 * Uses updateMany to be able to filter by (id + userId) without requiring a compound unique constraint.
 */
export async function updateApplication(userId: string, id: string, input: UpdateApplicationInput) {
  const data: any = {};

  // Only apply fields that were actually provided by the client (PATCH semantics)
  if (input.company !== undefined) data.company = input.company;
  if (input.position !== undefined) data.position = input.position;
  if (input.status !== undefined) data.status = input.status;
  if (input.jobLink !== undefined) data.jobLink = input.jobLink;
  if (input.description !== undefined) data.description = input.description;
  if (input.notes !== undefined) data.notes = input.notes;

  // Convert ISO string -> Date for Prisma
  if (input.dateApplied !== undefined) {
    data.dateApplied = input.dateApplied ? new Date(input.dateApplied) : null;
  }

  const result = await prisma.jobApplication.updateMany({
    where: { id, userId },
    data,
  });

  if (result.count === 0) {
    throw new AppError("Application not found", 404);
  }

  // Return the updated application
  return prisma.jobApplication.findFirst({ where: { id, userId } });

}


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
