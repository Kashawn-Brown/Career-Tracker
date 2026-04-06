// Column definitions for the applications table

// Column IDs for the applications table
export type ApplicationColumnId =
  | "favorite"
  | "company"
  | "position"
  | "location"
  | "jobType"
  | "salaryText"
  | "workMode"
  | "status"
  | "fitScore"
  | "dateApplied"
  | "createdAt"
  | "updatedAt"
  | "actions";

// Column definitions
export type ApplicationColumnDef = {
  id: ApplicationColumnId;
  label: string;
  required: boolean;        // cannot be hidden
  defaultVisible: boolean;  // initially visible
};

// Storage key for column visibility preference
export const APPLICATION_COLUMNS_STORAGE_KEY = "career-tracker:applications:visibleColumns";

// Storage key for default sort preference
export const APPLICATION_SORT_STORAGE_KEY = "career-tracker:applications:defaultSort";

// Column definitions for the applications table
export const APPLICATION_COLUMN_DEFS: readonly ApplicationColumnDef[] = [
  { id: "favorite",   label: "Favorite",             required: false, defaultVisible: true  },
  { id: "company",    label: "Company",               required: true,  defaultVisible: true  },
  { id: "position",   label: "Position",              required: true,  defaultVisible: true  },
  { id: "location",   label: "Location",              required: false, defaultVisible: true  },
  { id: "jobType",    label: "Type",                  required: false, defaultVisible: true  },
  { id: "workMode",   label: "Work Arrangement",      required: false, defaultVisible: true  },
  { id: "salaryText", label: "Salary",                required: false, defaultVisible: true  },
  { id: "status",     label: "Status",                required: true,  defaultVisible: true  },
  { id: "fitScore",   label: "Compatibility Score",   required: false, defaultVisible: true  },
  { id: "dateApplied",label: "Date Applied",          required: false, defaultVisible: true  },
  { id: "createdAt",  label: "Created",               required: false, defaultVisible: false },
  { id: "updatedAt",  label: "Last Updated",          required: false, defaultVisible: false },
  { id: "actions",    label: "Delete",                required: false, defaultVisible: true  },
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
 * Sort options available in the default sort picker.
 * Curated to the fields users most commonly want to anchor on.
 */
export type DefaultSortOption = {
  value: string; // ApplicationSortBy value
  label: string;
};

export const DEFAULT_SORT_OPTIONS: readonly DefaultSortOption[] = [
  { value: "updatedAt",  label: "Last Updated" },
  { value: "createdAt",  label: "Created"       },
  { value: "company",    label: "Company"        },
  { value: "position",   label: "Position"       },
] as const;

export type DefaultSortPreference = {
  sortBy:  string;
  sortDir: "asc" | "desc";
};

export const DEFAULT_SORT_PREFERENCE: DefaultSortPreference = {
  sortBy:  "updatedAt",
  sortDir: "desc",
};

/** Read persisted default sort from localStorage, falling back to the app default. */
export function readDefaultSortPreference(): DefaultSortPreference {
  try {
    const raw = localStorage.getItem(APPLICATION_SORT_STORAGE_KEY);
    if (!raw) return DEFAULT_SORT_PREFERENCE;
    const parsed = JSON.parse(raw) as Partial<DefaultSortPreference>;
    const validValues = DEFAULT_SORT_OPTIONS.map((o) => o.value);
    const sortBy  = validValues.includes(parsed.sortBy ?? "")
      ? (parsed.sortBy as string)
      : DEFAULT_SORT_PREFERENCE.sortBy;
    const sortDir = parsed.sortDir === "asc" || parsed.sortDir === "desc"
      ? parsed.sortDir
      : DEFAULT_SORT_PREFERENCE.sortDir;
    return { sortBy, sortDir };
  } catch {
    return DEFAULT_SORT_PREFERENCE;
  }
}

/**
 * Normalizes a stored column list:
 * - drops unknown ids
 * - ensures required columns are included
 * - enforces stable order
 */
export function normalizeVisibleColumns(columns: unknown): ApplicationColumnId[] {
  
  // Create a set of valid column ids
  const valid = new Set<ApplicationColumnId>(APPLICATION_COLUMN_ORDER);

  // If columns is not an array, return the default visible columns
  if (!Array.isArray(columns)) return DEFAULT_VISIBLE_APPLICATION_COLUMNS;

  // Filter the columns to only include valid column ids
  const provided = columns.filter(
    (x): x is ApplicationColumnId => typeof x === "string" && valid.has(x as ApplicationColumnId)
  );

  // If no valid columns are provided, return the default visible columns
  if (provided.length === 0) return DEFAULT_VISIBLE_APPLICATION_COLUMNS;

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