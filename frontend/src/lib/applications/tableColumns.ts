// Column definitions for the applications table

// Column IDs for the applications table
export type ApplicationColumnId =
  | "favorite"
  | "company"
  | "position"
  | "jobType"
  | "salaryText"
  | "workMode"
  | "status"
  | "dateApplied"
  | "updatedAt"
  | "actions";

// Column definitions
export type ApplicationColumnDef = {
  id: ApplicationColumnId;
  label: string;
  required: boolean;        // cannot be hidden
  defaultVisible: boolean;  // initially visible
};

// Storage key for the applications table columns (to be used with localStorage to remember the user's preferred visible columns)
export const APPLICATION_COLUMNS_STORAGE_KEY = "career-tracker:applications:visibleColumns";

// Column definitions for the applications table
export const APPLICATION_COLUMN_DEFS: readonly ApplicationColumnDef[] = [
  { id: "favorite",  label: "★",          required: true,  defaultVisible: true },
  { id: "company",   label: "Company",    required: true,  defaultVisible: true },
  { id: "position",  label: "Position",   required: true,  defaultVisible: true },
  { id: "jobType",   label: "Type",       required: false, defaultVisible: true },
  { id: "salaryText",label: "Salary",     required: false, defaultVisible: true },
  { id: "workMode",  label: "Work Arrangement",required: false, defaultVisible: true },
  { id: "status",    label: "Status",     required: true,  defaultVisible: true },
  { id: "dateApplied",label:"Date Applied",    required: false, defaultVisible: true },
  { id: "updatedAt", label: "Updated",    required: false, defaultVisible: true },
  { id: "actions",   label: "Actions",    required: true,  defaultVisible: true },
] as const;

// Column order for the applications table
export const APPLICATION_COLUMN_ORDER = APPLICATION_COLUMN_DEFS.map((c) => c.id);

// Required columns for the applications table
export const REQUIRED_APPLICATION_COLUMNS = APPLICATION_COLUMN_DEFS
  .filter((c) => c.required)
  .map((c) => c.id);

// Default visible columns for the applications table
export const DEFAULT_VISIBLE_APPLICATION_COLUMNS = APPLICATION_COLUMN_DEFS
  .filter((c) => c.defaultVisible)
  .map((c) => c.id);

/**
 * Normalizes a stored column list:
 * - drops unknown ids
 * - ensures required columns are included
 * - enforces stable order
 */
export function normalizeVisibleColumns(columns: unknown): ApplicationColumnId[] {
  
    // Create a set of valid column ids
  const valid = new Set<ApplicationColumnId>(APPLICATION_COLUMN_ORDER);

  // If the stored data is not an array, fall back to defaults
  if (!Array.isArray(columns)) return DEFAULT_VISIBLE_APPLICATION_COLUMNS;

  // Filter the provided column ids to only include valid ids
  const provided = columns.filter((x): x is ApplicationColumnId => typeof x === "string" && valid.has(x as ApplicationColumnId));

  // If storage array is empty/invalid, use defaults.
  if (provided.length === 0) return DEFAULT_VISIBLE_APPLICATION_COLUMNS;

  // Create a set of provided column ids and add required columns (in case they were somehow hidden)
  const set = new Set<ApplicationColumnId>(provided);
  for (const id of REQUIRED_APPLICATION_COLUMNS) set.add(id);

  return APPLICATION_COLUMN_ORDER.filter((id) => set.has(id));
}

// Check if all columns are visible
export function isAllColumnsVisible(visible: ApplicationColumnId[]) {
  return APPLICATION_COLUMN_ORDER.every((id) => visible.includes(id));
}

// Toggle a column visibility
export function toggleColumn(
  visible: ApplicationColumnId[],
  id: ApplicationColumnId
): ApplicationColumnId[] {
  const def = APPLICATION_COLUMN_DEFS.find((c) => c.id === id);
  if (def?.required) return visible; // guard: required can't be hidden

  // Create a set of visible columns; add or remove the column id
  const set = new Set(visible);
  if (set.has(id)) set.delete(id);
  else set.add(id);

  // Always keep required
  for (const req of REQUIRED_APPLICATION_COLUMNS) set.add(req);

  return APPLICATION_COLUMN_ORDER.filter((colId) => set.has(colId));
}
