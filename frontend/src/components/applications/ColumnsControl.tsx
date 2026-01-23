"use client";

// Column visibility controls componen

import { Button } from "@/components/ui/button";
import {
  APPLICATION_COLUMN_DEFS,
  APPLICATION_COLUMN_ORDER,
  DEFAULT_VISIBLE_APPLICATION_COLUMNS,
  REQUIRED_APPLICATION_COLUMNS,
  isAllColumnsVisible,
  toggleColumn,
  type ApplicationColumnId,
} from "@/lib/applications/tableColumns";

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
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {allVisible ? (
          <Button variant="outline" size="sm" onClick={handleHideOptional}>
            Hide optional
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleShowAll}>
            Show all
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset columns
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {APPLICATION_COLUMN_DEFS.map((col) => {
          const checked = visibleColumns.includes(col.id);

          return (
            <label
              key={col.id}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={col.required}
                onChange={() => handleToggle(col.id)}
                className="h-4 w-4"
              />
              <span className="flex-1">{col.label}</span>
              {col.required ? (
                <span className="text-xs text-muted-foreground">required</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}
