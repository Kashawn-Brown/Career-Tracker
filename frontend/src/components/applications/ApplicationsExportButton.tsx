"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import type { ApplicationFilters } from "@/lib/applications/filters";
import type { ApplicationSortBy, ApplicationSortDir, ApplicationExportColumn } from "@/types/api";
import type { ApplicationColumnId } from "@/lib/applications/tableColumns";
import {
  EXPORTABLE_APPLICATION_COLUMNS,
  EXPORT_COLUMN_LABELS,
  toExportColumns,
} from "@/lib/applications/export";
import { dateInputToStartIso, dateInputToEndIso } from "@/lib/applications/dates";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnsMode = "visible" | "all";

type Props = {
  filters:        ApplicationFilters;
  query:          string;          // committed (debounced) search query
  sortBy:         ApplicationSortBy;
  sortDir:        ApplicationSortDir;
  visibleColumns: ApplicationColumnId[];
  total:          number;          // total matching rows — used for summary + disabled state
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ApplicationsExportButton
 *
 * Export CSV button with a small configuration popover.
 * Exports all rows matching the current filters and sort — not just the current page.
 *
 * The user can choose between:
 *   - Visible columns (matches what they see in the table)
 *   - All standard columns (full export regardless of column visibility)
 */
export function ApplicationsExportButton({
  filters,
  query,
  sortBy,
  sortDir,
  visibleColumns,
  total,
}: Props) {
  const [open, setOpen]               = useState(false);
  const [columnsMode, setColumnsMode] = useState<ColumnsMode>("visible");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const isEmpty = total === 0;

  // Resolve which export columns to send based on the selected mode
  function resolveColumns(): ApplicationExportColumn[] {
    if (columnsMode === "all") return [...EXPORTABLE_APPLICATION_COLUMNS];
    return toExportColumns(visibleColumns);
  }

  async function handleDownload() {
    setError(null);
    setIsExporting(true);

    try {
      const { blob, filename } = await applicationsApi.exportCsv({
        // Filters
        statuses:  filters.statuses.length  ? filters.statuses  : undefined,
        jobTypes:  filters.jobTypes.length   ? filters.jobTypes  : undefined,
        workModes: filters.workModes.length  ? filters.workModes : undefined,
        isFavorite: filters.favoritesOnly || undefined,
        q:          query || undefined,
        fitMin:     filters.fitRange[0] !== 0   ? filters.fitRange[0] : undefined,
        fitMax:     filters.fitRange[1] !== 100 ? filters.fitRange[1] : undefined,
        dateAppliedFrom: dateInputToStartIso(filters.dateAppliedFrom) ?? undefined,
        dateAppliedTo:   dateInputToEndIso(filters.dateAppliedTo)     ?? undefined,
        updatedFrom:     dateInputToStartIso(filters.updatedFrom)     ?? undefined,
        updatedTo:       dateInputToEndIso(filters.updatedTo)         ?? undefined,

        // Sort
        sortBy,
        sortDir,

        // Columns
        columns: resolveColumns(),
      });

      // Trigger browser file download
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = filename ?? `CT_Applications_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={isEmpty}
          title={isEmpty ? "No applications to export" : "Export applications as CSV"}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4 space-y-4" align="end">

        {/* Summary */}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Export as CSV</p>
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString()} application{total !== 1 ? "s" : ""} matching
            your current filters and sort. Not limited to the current page.
          </p>
        </div>

        {/* Columns mode */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Columns
          </p>
          <div className="space-y-1">
            {(["visible", "all"] as ColumnsMode[]).map((mode) => {
              const isSelected = columnsMode === mode;
              const label      = mode === "visible"
                ? "Visible columns"
                : "All standard columns";
              const description = mode === "visible"
                ? "Matches what you see in the table"
                : `All ${EXPORTABLE_APPLICATION_COLUMNS.length} exportable columns`;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setColumnsMode(mode)}
                  className={[
                    "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-input hover:bg-accent/50",
                  ].join(" ")}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Download button */}
        <Button
          className="w-full"
          disabled={isExporting}
          onClick={handleDownload}
        >
          {isExporting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Exporting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </span>
          )}
        </Button>

      </PopoverContent>
    </Popover>
  );
}