import type { ApplicationStatus, JobType, WorkMode } from "@/types/api";

/** Default fit score range — used by page state and reset logic. */
export const DEFAULT_FIT_RANGE: [number, number] = [0, 100];

/**
 * The full set of filter state managed by the applications page.
 * Kept in one type so the page, panel, and API client stay in sync.
 */
export type ApplicationFilters = {
  q:               string;
  statuses:        ApplicationStatus[];
  jobTypes:        JobType[];
  workModes:       WorkMode[];
  favoritesOnly:   boolean;
  fitRange:        [number, number];
  dateAppliedFrom: string; // YYYY-MM-DD input value, empty string = unset
  dateAppliedTo:   string;
  updatedFrom:     string;
  updatedTo:       string;
};

/** Initial/reset state for all filters. */
export const DEFAULT_FILTERS: ApplicationFilters = {
  q:               "",
  statuses:        [],
  jobTypes:        [],
  workModes:       [],
  favoritesOnly:   false,
  fitRange:        DEFAULT_FIT_RANGE,
  dateAppliedFrom: "",
  dateAppliedTo:   "",
  updatedFrom:     "",
  updatedTo:       "",
};

/**
 * Counts active filter categories (not individual values).
 * Each category counts as 1 regardless of how many values are selected.
 * Used for the filter badge count on the collapsible trigger.
 */
export function countActiveFilters(filters: ApplicationFilters): number {
  return [
    filters.q.trim().length > 0,
    filters.statuses.length > 0,
    filters.jobTypes.length > 0,
    filters.workModes.length > 0,
    filters.favoritesOnly,
    filters.fitRange[0] !== DEFAULT_FIT_RANGE[0] || filters.fitRange[1] !== DEFAULT_FIT_RANGE[1],
    filters.dateAppliedFrom !== "" || filters.dateAppliedTo !== "",
    filters.updatedFrom !== "" || filters.updatedTo !== "",
  ].filter(Boolean).length;
}

/**
 * Toggles a value in a multi-select array.
 * Adds if not present, removes if already present.
 */
export function toggleMultiValue<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

/**
 * Formats a list of selected labels for display in the dropdown trigger.
 * Shows up to 2 labels, then "+N more".
 */
export function formatSelectedLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} (+${labels.length - 2} more)`;
}