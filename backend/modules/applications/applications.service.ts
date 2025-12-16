import { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

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
