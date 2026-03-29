"use client";

import { useState } from "react";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { STATUS_OPTIONS } from "@/lib/applications/presentation";
import { getStatusPillTokens, PILL_BASE_CLASS } from "@/lib/applications/pills";
import type { ApplicationFilters } from "@/lib/applications/filters";
import type {
  ApplicationSortBy,
  ApplicationSortDir,
  ApplicationExportColumn,
  ApplicationStatus,
} from "@/types/api";
import type { ApplicationColumnId } from "@/lib/applications/tableColumns";
import {
  EXPORTABLE_APPLICATION_COLUMNS,
  EXPORT_COLUMN_LABELS,
  toExportColumns,
} from "@/lib/applications/export";
import { dateInputToStartIso, dateInputToEndIso } from "@/lib/applications/dates";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  filters:        ApplicationFilters;
  query:          string;
  sortBy:         ApplicationSortBy;
  sortDir:        ApplicationSortDir;
  visibleColumns: ApplicationColumnId[];
  total:          number;
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: {
  title:    string;
  children: React.ReactNode;
  action?:  React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ApplicationsExportButton
 *
 * Opens a dialog to configure and download a CSV export.
 * Inherits the current filters and sort from the table.
 *
 * User can:
 *  - Exclude specific statuses from the export (e.g. Rejected, Withdrawn)
 *  - Choose which columns to include
 */
export function ApplicationsExportButton({
  filters,
  query,
  sortBy,
  sortDir,
  visibleColumns,
  total,
}: Props) {
  const [open, setOpen] = useState(false);

  // Statuses to exclude — all included by default
  const [excludedStatuses, setExcludedStatuses] = useState<ApplicationStatus[]>([]);

  // Columns to include — starts with visible table columns
  const [selectedColumns, setSelectedColumns] = useState<ApplicationExportColumn[]>(() =>
    toExportColumns(visibleColumns)
  );

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const isEmpty           = total === 0;
  const allStatusesExcluded = excludedStatuses.length === STATUS_OPTIONS.length;

  // Show "up to N" when statuses are excluded since we don't re-query for exact count
  const rowSummary = excludedStatuses.length > 0
    ? `up to ${total.toLocaleString()}`
    : total.toLocaleString();

  function handleOpen() {
    setExcludedStatuses([]);
    setSelectedColumns(toExportColumns(visibleColumns));
    setError(null);
    setOpen(true);
  }

  // ── Status toggle ─────────────────────────────────────────────────────────

  function toggleExcludedStatus(status: ApplicationStatus) {
    setExcludedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  function includeAllStatuses() {
    setExcludedStatuses([]);
  }

  // ── Column toggle ─────────────────────────────────────────────────────────

  function toggleColumn(col: ApplicationExportColumn) {
    setSelectedColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : EXPORTABLE_APPLICATION_COLUMNS.filter((c) => [...prev, col].includes(c))
    );
  }

  function selectAllColumns() {
    setSelectedColumns([...EXPORTABLE_APPLICATION_COLUMNS]);
  }

  // ── Download ──────────────────────────────────────────────────────────────

  async function handleDownload() {
    if (selectedColumns.length === 0) {
      setError("Select at least one column to export.");
      return;
    }
    if (allStatusesExcluded) return;

    setError(null);
    setIsExporting(true);

    try {
      const baseStatuses = filters.statuses.length
        ? filters.statuses
        : (STATUS_OPTIONS.map((o) => o.value) as ApplicationStatus[]);

      const effectiveStatuses = baseStatuses.filter(
        (s) => !excludedStatuses.includes(s)
      );

      const { blob, filename } = await applicationsApi.exportCsv({
        statuses:  effectiveStatuses.length < STATUS_OPTIONS.length
          ? effectiveStatuses : undefined,
        jobTypes:  filters.jobTypes.length  ? filters.jobTypes  : undefined,
        workModes: filters.workModes.length ? filters.workModes : undefined,
        isFavorite: filters.favoritesOnly   || undefined,
        q:          query                   || undefined,
        fitMin:     filters.fitRange[0] !== 0   ? filters.fitRange[0] : undefined,
        fitMax:     filters.fitRange[1] !== 100 ? filters.fitRange[1] : undefined,
        dateAppliedFrom: dateInputToStartIso(filters.dateAppliedFrom) ?? undefined,
        dateAppliedTo:   dateInputToEndIso(filters.dateAppliedTo)     ?? undefined,
        updatedFrom:     dateInputToStartIso(filters.updatedFrom)     ?? undefined,
        updatedTo:       dateInputToEndIso(filters.updatedTo)         ?? undefined,
        sortBy,
        sortDir,
        columns: selectedColumns,
      });

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        variant="outline"
        disabled={isEmpty}
        title={isEmpty ? "No applications to export" : "Export applications as CSV"}
        onClick={handleOpen}
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">

          {/* ── Header ── */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileDown className="h-4 w-4 shrink-0" />
              Export Applications
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{rowSummary}</span>
                {" "}application{total !== 1 ? "s" : ""} will be exported
                based on your current filters and sort order.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-1">

            {/* ── Statuses ── */}
            <Section
              title="Statuses"
              action={
                excludedStatuses.length > 0 ? (
                  <button
                    type="button"
                    onClick={includeAllStatuses}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    All
                  </button>
                ) : null
              }
            >
              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isExcluded = excludedStatuses.includes(option.value);
                    const { wrap, dot } = getStatusPillTokens(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleExcludedStatus(option.value)}
                        aria-pressed={!isExcluded}
                        className={cn(
                          PILL_BASE_CLASS,
                          "cursor-pointer transition-all duration-150 select-none",
                          isExcluded
                            ? "opacity-30 bg-muted/40 text-muted-foreground border-border line-through"
                            : cn(wrap, "hover:opacity-80")
                        )}
                      >
                        {!isExcluded && (
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a status to exclude it from the export.
                </p>
                {allStatusesExcluded && (
                  <p className="text-xs text-destructive">
                    At least one status must be included.
                  </p>
                )}
              </div>
            </Section>

            {/* ── Columns ── */}
            <Section
              title={`Columns — ${selectedColumns.length} / ${EXPORTABLE_APPLICATION_COLUMNS.length}`}
              action={
                selectedColumns.length < EXPORTABLE_APPLICATION_COLUMNS.length ? (
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    All
                  </button>
                ) : null
              }
            >
              <div className="rounded-md border bg-muted/10 p-3 grid grid-cols-2 gap-x-6 gap-y-3">
                {EXPORTABLE_APPLICATION_COLUMNS.map((col) => (
                  <div key={col} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`col-${col}`}
                      checked={selectedColumns.includes(col)}
                      onCheckedChange={() => toggleColumn(col)}
                    />
                    <Label
                      htmlFor={`col-${col}`}
                      className="text-sm cursor-pointer leading-none"
                    >
                      {EXPORT_COLUMN_LABELS[col]}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Click a column to include or exclude it from the export.
              </p>
              {selectedColumns.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Select at least one column.
                </p>
              )}
            </Section>

            {/* ── Error ── */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

          </div>

          {/* ── Footer ── */}
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isExporting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={
                isExporting ||
                selectedColumns.length === 0 ||
                allStatusesExcluded
              }
              onClick={handleDownload}
            >
              {isExporting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  );
}