import type { ApplicationExportColumn } from "./applications.dto.js";
import { APPLICATION_EXPORT_COLUMNS } from "./applications.dto.js";
import { AppError } from "../../errors/app-error.js";

/**
 * CSV export helpers for job applications.
 *
 * Owns:
 * - column metadata (header labels + value extractors)
 * - CSV cell escaping and spreadsheet injection protection
 * - CSV serialization
 * - filename generation
 * - column normalization from query params
 */


// ─── Column definitions ───────────────────────────────────────────────────────

/**
 * Human-friendly status labels for CSV output.
 * Kept local so export format stays stable even if UI labels change.
 */
const STATUS_LABELS: Record<string, string> = {
  WISHLIST:  "Interested",
  APPLIED:   "Applied",
  INTERVIEW: "Interviewing",
  OFFER:     "Offer Received",
  REJECTED:  "Rejected",
  WITHDRAWN: "Withdrawn",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  UNKNOWN:    "",
  FULL_TIME:  "Full-time",
  PART_TIME:  "Part-time",
  CONTRACT:   "Contract",
  INTERNSHIP: "Internship",
};

const WORK_MODE_LABELS: Record<string, string> = {
  UNKNOWN: "",
  REMOTE:  "Remote",
  HYBRID:  "Hybrid",
  ONSITE:  "On-site",
};

type ApplicationRow = {
  isFavorite:   boolean;
  company:      string;
  position:     string;
  location:     string | null;
  jobType:      string;
  salaryText:   string | null;
  workMode:     string;
  status:       string;
  fitScore:     number | null;
  dateApplied:  Date | null;
  updatedAt:    Date;
};

type ColumnDef = {
  id:     ApplicationExportColumn;
  header: string;
  value:  (row: ApplicationRow) => string;
};

/**
 * Ordered column definitions — header label and value extractor per column.
 * Produces stable, human-readable output suitable for Excel/Sheets.
 */
export const EXPORT_COLUMN_DEFS: ColumnDef[] = [
  {
    id:     "favorite",
    header: "Starred",
    value:  (r) => r.isFavorite ? "Yes" : "No",
  },
  {
    id:     "company",
    header: "Company",
    value:  (r) => r.company,
  },
  {
    id:     "position",
    header: "Position",
    value:  (r) => r.position,
  },
  {
    id:     "location",
    header: "Location",
    value:  (r) => r.location ?? "",
  },
  {
    id:     "jobType",
    header: "Job Type",
    value:  (r) => JOB_TYPE_LABELS[r.jobType] ?? r.jobType,
  },
  {
    id:     "salaryText",
    header: "Salary",
    value:  (r) => r.salaryText ?? "",
  },
  {
    id:     "workMode",
    header: "Work Mode",
    value:  (r) => WORK_MODE_LABELS[r.workMode] ?? r.workMode,
  },
  {
    id:     "status",
    header: "Status",
    value:  (r) => STATUS_LABELS[r.status] ?? r.status,
  },
  {
    id:     "fitScore",
    header: "Compatibility Score",
    value:  (r) => (r.fitScore !== null && r.fitScore !== undefined) ? String(r.fitScore) : "",
  },
  {
    id:     "dateApplied",
    header: "Date Applied",
    value:  (r) => r.dateApplied ? formatDateYmd(r.dateApplied) : "",
  },
  {
    id:     "updatedAt",
    header: "Last Updated",
    value:  (r) => r.updatedAt.toISOString(),
  },
];


// ─── CSV safety ───────────────────────────────────────────────────────────────

/**
 * Escapes a single CSV cell value.
 * - Wraps in double quotes if the value contains a comma, quote, or newline.
 * - Doubles any internal double quotes (RFC 4180).
 */
export function escapeCsvCell(value: string): string {
  const needsQuoting = /[",\n\r]/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Guards against spreadsheet formula injection.
 * Values that start with =, +, -, or @ can be executed as formulas
 * when opened in Excel or Google Sheets.
 * Prefixes dangerous values with a single quote to neutralize them.
 */
export function sanitizeSpreadsheetCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

/**
 * Applies both safety transformations to a cell value.
 */
function safeCell(raw: string): string {
  return escapeCsvCell(sanitizeSpreadsheetCell(raw));
}


// ─── CSV serialization ────────────────────────────────────────────────────────

/**
 * Serializes application rows to a CSV string.
 *
 * - UTF-8 BOM prefix for Excel compatibility
 * - CRLF line endings (RFC 4180)
 * - All cells sanitized against formula injection and quote escaping
 */
export function buildApplicationsCsv(
  rows:    ApplicationRow[],
  columns: ApplicationExportColumn[]
): string {
  // Filter to only the requested columns, preserving definition order
  const defs = EXPORT_COLUMN_DEFS.filter((d) => columns.includes(d.id));

  if (defs.length === 0) {
    throw new AppError("No valid export columns selected.", 400, "EXPORT_NO_COLUMNS");
  }

  const lines: string[] = [];

  // Header row
  lines.push(defs.map((d) => escapeCsvCell(d.header)).join(","));

  // Data rows
  for (const row of rows) {
    lines.push(
      defs.map((d) => safeCell(d.value(row))).join(",")
    );
  }

  // UTF-8 BOM + CRLF line endings for Excel compatibility
  return "\uFEFF" + lines.join("\r\n");
}


// ─── Column normalization ─────────────────────────────────────────────────────

/**
 * Parses and validates a CSV string of export column ids.
 * Returns the default (all columns) if none are provided.
 * Throws 400 if any value is not a valid export column id.
 */
export function normalizeExportColumns(
  raw?: string
): ApplicationExportColumn[] {
  if (!raw?.trim()) {
    return [...APPLICATION_EXPORT_COLUMNS];
  }

  const requested = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const valid = new Set<string>(APPLICATION_EXPORT_COLUMNS);
  const result: ApplicationExportColumn[] = [];
  const seen  = new Set<string>();

  for (const col of requested) {
    if (!valid.has(col)) {
      throw new AppError(
        `Invalid export column: "${col}".`,
        400,
        "INVALID_EXPORT_COLUMN"
      );
    }
    if (!seen.has(col)) {
      seen.add(col);
      result.push(col as ApplicationExportColumn);
    }
  }

  return result.length > 0 ? result : [...APPLICATION_EXPORT_COLUMNS];
}


// ─── Filename ─────────────────────────────────────────────────────────────────

/**
 * Generates a dated export filename.
 * Format: applications-YYYY-MM-DD.csv
 */
export function buildExportFilename(now: Date = new Date()): string {
  return `applications-${formatDateYmd(now)}.csv`;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}