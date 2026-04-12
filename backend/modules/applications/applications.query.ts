import { Prisma } from "@prisma/client";
import type { ListApplicationsParams } from "./applications.dto.js";

/**
 * Shared query builders for application filtering and sorting.
 *
 * Used by both listApplications() and exportApplicationsCsv() so filter
 * logic stays in one place and cannot drift between the two flows.
 */


/**
 * Builds the Prisma where-clause for application filtering.
 * Handles user scoping, multi-select enums, search, favorites, fit score,
 * and date ranges.
 *
 * Plural CSV filters (statuses/jobTypes/workModes) take precedence over
 * legacy singular filters when both are present.
 */
export function buildApplicationsWhere(
  params: Pick<
    ListApplicationsParams,
    | "userId"
    | "status"  | "statuses"
    | "jobType" | "jobTypes"
    | "workMode"| "workModes"
    | "isFavorite"
    | "q"
    | "fitMin" | "fitMax"
    | "dateAppliedFrom" | "dateAppliedTo"
    | "updatedFrom"     | "updatedTo"
  >
): Prisma.JobApplicationWhereInput {
  const where: Prisma.JobApplicationWhereInput = { userId: params.userId };

  // ── Multi-select enum filters (plural wins over singular) ─────────────

  if (params.statuses?.length) {
    where.status = { in: params.statuses };
  } else if (params.status) {
    where.status = params.status;
  }

  if (params.jobTypes?.length) {
    where.jobType = { in: params.jobTypes };
  } else if (params.jobType) {
    where.jobType = params.jobType;
  }

  if (params.workModes?.length) {
    where.workMode = { in: params.workModes };
  } else if (params.workMode) {
    where.workMode = params.workMode;
  }

  // ── Favorites filter ──────────────────────────────────────────────────

  if (params.isFavorite !== undefined) {
    where.isFavorite = params.isFavorite;
  }

  // ── Text search: company, position, location, tagsText ────────────────

  if (params.q) {
    where.OR = [
      { company:  { contains: params.q, mode: "insensitive" } },
      { position: { contains: params.q, mode: "insensitive" } },
      { location: { contains: params.q, mode: "insensitive" } },
      { tagsText: { contains: params.q, mode: "insensitive" } },
    ];
  }

  // ── Fit score range ───────────────────────────────────────────────────

  const fitMin = params.fitMin ?? 0;
  const fitMax = params.fitMax ?? 100;

  const hasFitFilter =
    (params.fitMin !== undefined || params.fitMax !== undefined) &&
    !(fitMin === 0 && fitMax === 100);

  if (hasFitFilter) {
    where.fitScore = { gte: fitMin, lte: fitMax };
  }

  // ── Date range filters ────────────────────────────────────────────────

  if (params.dateAppliedFrom || params.dateAppliedTo) {
    where.dateApplied = {
      ...(params.dateAppliedFrom ? { gte: new Date(params.dateAppliedFrom) } : {}),
      ...(params.dateAppliedTo   ? { lte: new Date(params.dateAppliedTo)   } : {}),
    };
  }

  if (params.updatedFrom || params.updatedTo) {
    where.updatedAt = {
      ...(params.updatedFrom ? { gte: new Date(params.updatedFrom) } : {}),
      ...(params.updatedTo   ? { lte: new Date(params.updatedTo)   } : {}),
    };
  }

  return where;
}


/**
 * Nullable sort fields: keep nulls at the bottom for both asc and desc.
 * Any field listed here will use Prisma's { sort, nulls: "last" } syntax.
 */
const NULLS_LAST_FIELDS = new Set([
  "fitScore",
  "dateApplied",
]);

/**
 * Builds the Prisma orderBy clause for application sorting.
 * Always appends updatedAt desc as a stable tiebreaker.
 */
// Text fields that need case-insensitive sorting (Prisma doesn't support
// lower() in orderBy, so we sort these in JS after fetching).
export const TEXT_SORT_FIELDS = new Set([
  "company",
  "position",
]);

export function buildApplicationsOrderBy(
  sortBy:  NonNullable<ListApplicationsParams["sortBy"]>,
  sortDir: NonNullable<ListApplicationsParams["sortDir"]>
): Prisma.JobApplicationOrderByWithRelationInput[] {
  // Text fields are handled via JS sort in the service — use stable tiebreaker only
  if (TEXT_SORT_FIELDS.has(sortBy)) {
    return [{ updatedAt: "desc" }];
  }

  if (NULLS_LAST_FIELDS.has(sortBy)) {
    return [
      { [sortBy]: { sort: sortDir, nulls: "last" } },
      { updatedAt: "desc" },
    ] as Prisma.JobApplicationOrderByWithRelationInput[];
  }

  return [
    { [sortBy]: sortDir },
    { updatedAt: "desc" },
  ] as Prisma.JobApplicationOrderByWithRelationInput[];
}