"use client";

import { cn } from "@/lib/utils";
import {
  APPLICATION_COLUMN_DEFS,
  APPLICATION_COLUMN_ORDER,
  DEFAULT_SORT_OPTIONS,
  DEFAULT_VISIBLE_APPLICATION_COLUMNS,
  REQUIRED_APPLICATION_COLUMNS,
  isAllColumnsVisible,
  toggleColumn,
  type ApplicationColumnId,
  type DefaultSortPreference,
} from "@/lib/applications/tableColumns";
import type { ApplicationSortBy, ApplicationSortDir } from "@/types/api";

/**
 * ColumnsControl
 *
 * Two sections:
 *  1. Visible columns — chip-style toggles, required columns locked
 *  2. Default sort — pick the sort field + direction that the page loads with
 *
 * Both preferences are persisted to localStorage by the parent page.
 */
export function ColumnsControl({
  visibleColumns,
  onChange,
  defaultSort,
  onDefaultSortChange,
}: {
  visibleColumns:      ApplicationColumnId[];
  onChange:            (next: ApplicationColumnId[]) => void;
  defaultSort:         DefaultSortPreference;
  onDefaultSortChange: (next: DefaultSortPreference) => void;
}) {
  const allVisible = isAllColumnsVisible(visibleColumns);

  function handleToggle(id: ApplicationColumnId) {
    onChange(toggleColumn(visibleColumns, id));
  }

  function handleShowAll() {
    onChange([...APPLICATION_COLUMN_ORDER]);
  }

  function handleHideOptional() {
    onChange([...REQUIRED_APPLICATION_COLUMNS]);
  }

  function handleReset() {
    onChange([...DEFAULT_VISIBLE_APPLICATION_COLUMNS]);
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-5">

      {/* ── Section 1: Visible columns ───────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Visible columns
        </div>

        {/* Show All / Hide Optional + Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allVisible ? handleHideOptional : handleShowAll}
            className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors font-medium"
          >
            {allVisible ? "Hide Optional" : "Show All"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-sm rounded bg-muted text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            Reset to default
          </button>
        </div>

        {/* Column chips */}
        <div className="flex flex-wrap gap-1.5">
          {APPLICATION_COLUMN_DEFS.map((col) => {
            const isVisible  = visibleColumns.includes(col.id);
            const isRequired = col.required;

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => !isRequired && handleToggle(col.id)}
                disabled={isRequired}
                title={isRequired ? "Required column" : `Toggle ${col.label}`}
                className={cn(
                  "px-4 py-2 text-sm rounded transition-colors select-none",
                  isVisible
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-muted text-muted-foreground hover:bg-muted/60",
                  isRequired
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                )}
              >
                {col.label}{isRequired ? " *" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Default sort ───────────────────────────────────── */}
      <div className="space-y-2.5 border-t pt-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Default sort
        </div>
        <p className="text-xs text-muted-foreground">
          The sort applied when you open the page. Clicking a column header still overrides it temporarily.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort field */}
          <select
            value={defaultSort.sortBy}
            onChange={(e) =>
              onDefaultSortChange({ ...defaultSort, sortBy: e.target.value as ApplicationSortBy })
            }
            className="rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DEFAULT_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort direction */}
          <select
            value={defaultSort.sortDir}
            onChange={(e) =>
              onDefaultSortChange({ ...defaultSort, sortDir: e.target.value as ApplicationSortDir })
            }
            className="rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

    </div>
  );
}