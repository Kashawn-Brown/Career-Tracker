import { ApplicationStatus, JobType, WorkMode } from "@prisma/client";
import { AppError } from "../../errors/app-error.js";

/**
 * Normalized filter object produced by parseApplicationFilters().
 * All enum values are validated; dates are validated as parseable ISO strings.
 * Arrays are non-empty when present (empty arrays are dropped to undefined).
 */
export type ParsedApplicationFilters = {
  statuses?:  ApplicationStatus[];
  jobTypes?:  JobType[];
  workModes?: WorkMode[];

  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;
};

// Valid enum sets for fast lookup
const VALID_STATUSES  = new Set(Object.values(ApplicationStatus));
const VALID_JOB_TYPES = new Set(Object.values(JobType));
const VALID_WORK_MODES = new Set(Object.values(WorkMode));


/**
 * Parses and validates incoming query params into a clean filter object.
 *
 * Rules:
 * - Plural CSV params (statuses/jobTypes/workModes) win over singular when both present.
 * - Invalid enum values in CSV → 400.
 * - dateAppliedFrom > dateAppliedTo → 400.
 * - updatedFrom > updatedTo → 400.
 * - fitMin > fitMax → 400 (validated here so the error is consistent).
 */
export function parseApplicationFilters(raw: {
  // Legacy singular
  status?:   ApplicationStatus;
  jobType?:  JobType;
  workMode?: WorkMode;

  // New plural CSV
  statuses?:  string;
  jobTypes?:  string;
  workModes?: string;

  // Dates
  dateAppliedFrom?: string;
  dateAppliedTo?:   string;
  updatedFrom?:     string;
  updatedTo?:       string;

  // Fit (validated here for consistency)
  fitMin?: number;
  fitMax?: number;
}): ParsedApplicationFilters {

  // ── Enum multi-select parsing ──────────────────────────────────────────

  const statuses  = parseCsvEnum(raw.statuses,  VALID_STATUSES,  "statuses")
    ?? (raw.status  ? [raw.status]  : undefined);

  const jobTypes  = parseCsvEnum(raw.jobTypes,  VALID_JOB_TYPES, "jobTypes")
    ?? (raw.jobType  ? [raw.jobType]  : undefined);

  const workModes = parseCsvEnum(raw.workModes, VALID_WORK_MODES, "workModes")
    ?? (raw.workMode ? [raw.workMode] : undefined);

  // ── Date range validation ──────────────────────────────────────────────

  validateDateRange(raw.dateAppliedFrom, raw.dateAppliedTo, "dateApplied");
  validateDateRange(raw.updatedFrom,     raw.updatedTo,     "updated");

  // ── Fit score range validation ─────────────────────────────────────────

  if (
    raw.fitMin !== undefined &&
    raw.fitMax !== undefined &&
    raw.fitMin > raw.fitMax
  ) {
    throw new AppError("Fit score range is invalid.", 400, "INVALID_FIT_RANGE");
  }

  // ── Return normalized filter object ───────────────────────────────────

  return {
    statuses:  statuses?.length  ? statuses  as ApplicationStatus[] : undefined,
    jobTypes:  jobTypes?.length  ? jobTypes  as JobType[]           : undefined,
    workModes: workModes?.length ? workModes as WorkMode[]          : undefined,

    dateAppliedFrom: raw.dateAppliedFrom,
    dateAppliedTo:   raw.dateAppliedTo,
    updatedFrom:     raw.updatedFrom,
    updatedTo:       raw.updatedTo,
  };
}


// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Splits a CSV string, trims each value, validates against allowed set.
 * Returns undefined if the input is undefined/empty.
 * Throws 400 if any value is not in the allowed set.
 */
function parseCsvEnum<T extends string>(
  csv: string | undefined,
  allowed: Set<string>,
  fieldName: string
): T[] | undefined {
  if (!csv?.trim()) return undefined;

  const values = csv
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (values.length === 0) return undefined;

  // Dedupe while preserving order
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const v of values) {
    if (!allowed.has(v)) {
      throw new AppError(
        `Invalid value "${v}" for filter "${fieldName}".`,
        400,
        "INVALID_FILTER_VALUE"
      );
    }
    if (!seen.has(v)) {
      seen.add(v);
      deduped.push(v as T);
    }
  }

  return deduped;
}

/**
 * Validates that a date range is logically ordered (from <= to).
 * Both boundaries are optional — only validates when both are present.
 */
function validateDateRange(
  from: string | undefined,
  to:   string | undefined,
  fieldPrefix: string
): void {
  if (!from || !to) return;

  const fromMs = Date.parse(from);
  const toMs   = Date.parse(to);

  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return; // schema already validated format

  if (fromMs > toMs) {
    throw new AppError(
      `${fieldPrefix} date range is invalid: "from" must be before "to".`,
      400,
      "INVALID_DATE_RANGE"
    );
  }
}