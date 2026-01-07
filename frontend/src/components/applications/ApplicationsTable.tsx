"use client";

import { useState } from "react";
import type { Application, ApplicationSortBy, ApplicationSortDir } from "@/types/api";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { APPLICATION_COLUMN_DEFS, type ApplicationColumnId } from "@/lib/applications/tableColumns";
import { Button } from "@/components/ui/button";
import { Alert } from "../ui/alert";
import { ChevronDown, ChevronUp } from "lucide-react";

// Helper to display a sortable header in the table
function SortableHeader({
  label,
  col,
  sortBy,
  sortDir,
  isDefaultSort,
  onSort,
  className,
}: {
  label: string;
  col: ApplicationSortBy;
  sortBy: ApplicationSortBy;
  sortDir: ApplicationSortDir;
  isDefaultSort: boolean;
  onSort: (col: ApplicationSortBy) => void;
  className?: string;
}) {
  const isActive = sortBy === col;
  const showArrow = isActive && !isDefaultSort;

  return (
    <th
      className={cn("p-3 select-none", className)}
      aria-sort={
        isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "w-full px-3 py-3 inline-flex items-center justify-start gap-1 text-left",
          "cursor-pointer select-none ",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        )}
      >
        <span>{label}</span>

        {showArrow ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )
        ) : null}
      </button>
    </th>
  );
}

// ApplicationsTable: read-only list + MVP row actions (update status + delete).
export function ApplicationsTable({
  items,      // the list of applications to display
  sortBy,    // the column to sort by
  sortDir,   // the direction to sort in
  isDefaultSort, // whether the sort is the default sort
  onSort,    // a callback to tell the parent: "Sort changed, refetch"
  onChanged,  // a callback to tell the parent: "Something changed, refetch" (update/delete)
  visibleColumns, // the columns to display
  onRowClick,  // a callback to tell the parent: "Row clicked, open details drawer"
}: {
  items: Application[];
  sortBy: ApplicationSortBy;
  sortDir: ApplicationSortDir;
  isDefaultSort: boolean;
  onSort: (nextSortBy: ApplicationSortBy) => void;
  onChanged: () => void;
  visibleColumns: ApplicationColumnId[];
  onRowClick?: (application: Application) => void;
}) {
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);      // stores the ID of the row currently being updated/deleted

  // Get the definitions for the visible columns
  const visibleColumnsDefs = APPLICATION_COLUMN_DEFS.filter((c) => visibleColumns.includes(c.id));

  // Deleting an Application
  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this application?");  // 2-step process asking for user confirmation
    if (!ok) return;

    setRowError(null);
    setBusyId(id);

    try {
      await applicationsApi.remove(id);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) setRowError(err.message);
      else setRowError("Failed to delete application.");
    } finally {
      setBusyId(null);
    }
  }


  return (
    <div className="space-y-2">
      {rowError ? ( <Alert variant="destructive" className="py-2">{rowError}</Alert> ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-center">
              {visibleColumnsDefs.map((col) => {
                switch (col.id) {
                  case "favorite":
                    return <th key={col.id} className="p-3 w-[60px] text-center" title="Starred">{col.label}</th>;
                    // return <SortableHeader key={col.id} label={col.label} col="isFavorite" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />;

                  case "salaryText":
                  case "actions":
                    return <th key={col.id} className="p-3">{col.label}</th>;

                  case "company":
                  case "position":
                  case "location":
                  case "jobType":
                  case "workMode":
                  case "status":
                  case "dateApplied":
                  case "updatedAt":
                    return (
                      <SortableHeader
                        key={col.id}
                        label={col.label}
                        col={col.id as ApplicationSortBy}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        isDefaultSort={isDefaultSort}
                        onSort={onSort}
                      />
                    );

                  default:
                    return null;
                }
              })}
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={visibleColumnsDefs.length}>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">No applications to show</div>
                    <div className="text-sm text-muted-foreground">
                      Add an application above to get started.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((application) => (
                <tr
                  key={application.id}
                  onClick={() => onRowClick?.(application)}  // click application row to open its details drawer  
                  className={cn(
                    "border-t transition-colors hover:bg-muted/40 even:bg-muted/20",
                    onRowClick && "cursor-pointer",
                    busyId === application.id && "opacity-60"
                  )}
                >
                  {visibleColumnsDefs.map((col) => {
                    switch (col.id) {
                      case "favorite":
                        return <td key={col.id} className="p-3 w-[60px] text-center">{application.isFavorite ? "★" : ""}</td>;

                      case "company":
                        return <td key={col.id} className="p-3">{application.company}</td>;

                      case "position":
                        return <td key={col.id} className="p-3">{application.position}</td>;

                      case "location":
                        return <td key={col.id} className="p-3">{application.location ?? "—"}</td>;

                      case "jobType":
                        return <td key={col.id} className="p-3">{jobTypeLabel(application.jobType)}</td>;

                      case "salaryText":
                        return <td key={col.id} className="p-3">{application.salaryText ?? "—"}</td>;

                      case "workMode":
                        return <td key={col.id} className="p-3">{workModeLabel(application.workMode)}</td>;

                      case "status":
                        return <td key={col.id} className="p-3">{statusLabel(application.status)}</td>;

                      case "dateApplied":
                        return (
                          <td key={col.id} className="p-3 text-muted-foreground">
                            {application.dateApplied ? new Date(application.dateApplied).toLocaleDateString() : "N/A"}
                          </td>
                        );

                      case "updatedAt":
                        return (
                          <td key={col.id} className="p-3 text-muted-foreground">
                            {new Date(application.updatedAt).toLocaleDateString()}
                          </td>
                        );

                      case "actions":
                        return (
                          <td key={col.id} className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === application.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(application.id);
                              }}
                            >
                              Delete
                            </Button>
                          </td>
                        );

                      default:
                        return null;
                    }
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
