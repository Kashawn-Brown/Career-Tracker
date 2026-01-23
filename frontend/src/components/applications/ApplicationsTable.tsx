"use client";

import { useState } from "react";
import type { ApplicationListItem, ApplicationSortBy, ApplicationSortDir } from "@/types/api";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { statusLabel, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { APPLICATION_COLUMN_DEFS, type ApplicationColumnId } from "@/lib/applications/tableColumns";
import { PILL_BASE_CLASS, getStatusPillTokens } from "@/lib/applications/pills";
import { Button } from "@/components/ui/button";
import { Alert } from "../ui/alert";
import { ChevronDown, ChevronUp, Star, X } from "lucide-react";

// Helper to get the badge class for the fit score
function getFitBadgeClass(score: number) {
  if (score >= 85) return "border-green-200 bg-green-50 text-green-700";
  if (score >= 70) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 50) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}


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
  items: ApplicationListItem[];
  sortBy: ApplicationSortBy;
  sortDir: ApplicationSortDir;
  isDefaultSort: boolean;
  onSort: (nextSortBy: ApplicationSortBy) => void;
  onChanged: () => void;
  visibleColumns: ApplicationColumnId[];
  onRowClick?: (application: ApplicationListItem) => void;
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
      {rowError ? (
        <div className="relative">
          <Alert variant="destructive" className="py-2 pr-10">
            {rowError}
          </Alert>

          <button
            type="button"
            onClick={() => setRowError(null)}
            className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss message"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          {/* Table header */}
          <thead className="bg-muted/50">
            <tr className="text-center">
              {visibleColumnsDefs.map((col) => {
                switch (col.id) {
                  case "favorite":
                    return <th key={col.id} className="p-3 w-[60px] text-center" title="Starred"></th>;
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
                  case "fitScore":
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

          {/* Table body */}
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
                        return <td key={col.id} className="p-3 w-[60px] text-center"><Star className={application.isFavorite ? "h-4 w-4 fill-yellow-500 text-yellow-500" : "h-4 w-4 text-gray-400 "} /></td>;

                      case "company":
                        return <td key={col.id} className="p-3 font-medium">{application.company}</td>;

                      case "position":
                        return <td key={col.id} className="p-3">{application.position}</td>;

                      case "location":
                        return <td key={col.id} className="p-3 ">{application.location ?? "—"}</td>;

                      case "jobType":
                        return <td key={col.id} className="p-3 text-muted-foreground">{jobTypeLabel(application.jobType)}</td>;

                      case "salaryText":
                        return <td key={col.id} className="p-3 text-muted-foreground">{application.salaryText ?? "—"}</td>;

                      case "workMode":
                        return <td key={col.id} className="p-3 text-muted-foreground">{workModeLabel(application.workMode)}</td>;

                      case "status":{
                        const { wrap, dot } = getStatusPillTokens(application.status);
                        return (
                          <td key={col.id} className="p-3">
                            <span className={cn(PILL_BASE_CLASS, wrap)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
                              {statusLabel(application.status)}
                            </span>
                          </td>
                        );
                      }

                      case "fitScore": {
                        const score = application.fitScore;
                        return (
                          <td key={col.id} className="p-3 text-muted-foreground">
                            {typeof score === "number" ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
                                  getFitBadgeClass(score)
                                )}
                                title={`${score}/100`}
                              >
                                {score}/100
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      }
                      

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
                          <td key={col.id} className="p-3 text-right text-muted-foreground">
                            <Button
                              className="hover:text-destructive hover:bg-destructive/10"
                              variant="outline"
                              size="sm"
                              disabled={busyId === application.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(application.id);
                              }}
                            >
                              <X className="h-4 w-4" />
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
