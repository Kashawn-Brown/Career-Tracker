"use client";

import { cn } from "@/lib/utils";
import {
  APPLICATION_COLUMN_DEFS,
  APPLICATION_COLUMN_ORDER,
  DEFAULT_VISIBLE_APPLICATION_COLUMNS,
  REQUIRED_APPLICATION_COLUMNS,
  isAllColumnsVisible,
  toggleColumn,
  type ApplicationColumnId,
} from "@/lib/applications/tableColumns";

/**
 * ColumnsControl
 *
 * Chip-style column visibility toggles.
 * - Visible columns are highlighted (blue tint)
 * - Hidden columns are muted
 * - Required columns show an asterisk and cannot be toggled
 * - "Show All" / "Hide Optional" toggles all optional columns at once
 */
export function ColumnsControl({
  visibleColumns,
  onChange,
}: {
  visibleColumns: ApplicationColumnId[];
  onChange: (next: ApplicationColumnId[]) => void;
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
    <div className="rounded-md border bg-muted/20 p-3 space-y-2.5">

      {/* Show All / Hide Optional + Reset to default actions */}
      <div className="flex items-center gap-2 mb-5">
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
  );
}