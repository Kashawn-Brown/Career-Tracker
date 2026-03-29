import type { ApplicationExportColumn } from "@/types/api";
import type { ApplicationColumnId } from "@/lib/applications/tableColumns";

/**
 * Frontend export helpers.
 * Owns exportable column metadata, visible-to-export mapping,
 * and default column sets.
 */

// ─── Exportable columns ───────────────────────────────────────────────────────

/**
 * All columns that can appear in a CSV export, in display order.
 * Matches the backend APPLICATION_EXPORT_COLUMNS — actions excluded.
 */
export const EXPORTABLE_APPLICATION_COLUMNS: ApplicationExportColumn[] = [
  "favorite",
  "company",
  "position",
  "location",
  "jobType",
  "salaryText",
  "workMode",
  "status",
  "fitScore",
  "dateApplied",
  "updatedAt",
];

/**
 * Human-readable labels for each export column.
 * Used in the export dialog to describe what's included.
 */
export const EXPORT_COLUMN_LABELS: Record<ApplicationExportColumn, string> = {
  favorite:    "Starred",
  company:     "Company",
  position:    "Position",
  location:    "Location",
  jobType:     "Job Type",
  salaryText:  "Salary",
  workMode:    "Work Mode",
  status:      "Status",
  fitScore:    "Compatibility Score",
  dateApplied: "Date Applied",
  updatedAt:   "Last Updated",
};

// ─── Column mapping ───────────────────────────────────────────────────────────

/**
 * Maps visible table column ids to their corresponding export column ids.
 * Table columns that have no export equivalent (e.g. "actions") are dropped.
 */
const TABLE_TO_EXPORT: Partial<Record<ApplicationColumnId, ApplicationExportColumn>> = {
  favorite:    "favorite",
  company:     "company",
  position:    "position",
  location:    "location",
  jobType:     "jobType",
  salaryText:  "salaryText",
  workMode:    "workMode",
  status:      "status",
  fitScore:    "fitScore",
  dateApplied: "dateApplied",
  updatedAt:   "updatedAt",
  // "actions" intentionally omitted
};

/**
 * Converts the current visible table column ids into export column ids.
 * Preserves the visible column order and drops any non-exportable columns.
 */
export function toExportColumns(
  visibleColumns: ApplicationColumnId[]
): ApplicationExportColumn[] {
  return visibleColumns
    .map((id) => TABLE_TO_EXPORT[id])
    .filter((col): col is ApplicationExportColumn => col !== undefined);
}