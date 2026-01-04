"use client";

import { useState } from "react";
import type { Application, ApplicationStatus, ApplicationSortBy, ApplicationSortDir } from "@/types/api";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, jobTypeLabel, workModeLabel } from "@/lib/applications/presentation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
}: {
  items: Application[];
  sortBy: ApplicationSortBy;
  sortDir: ApplicationSortDir;
  isDefaultSort: boolean;
  onSort: (nextSortBy: ApplicationSortBy) => void;
  onChanged: () => void;
}) {
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);      // stores the ID of the row currently being updated/deleted

  // Updating status
  async function handleStatusChange(id: string, next: ApplicationStatus) {
    setRowError(null);
    setBusyId(id);

    try {
      await applicationsApi.updateStatus(id, next);
      onChanged();  // on success, call so parent refetches
    } catch (err) {
      if (err instanceof ApiError) setRowError(err.message);
      else setRowError("Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

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
              {/* <SortableHeader label="★" col="isFavorite" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} /> */}
              <th className="p-3 w-[60px] text-center" title="Starred">★</th>
              
              <SortableHeader label="Company" col="company" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />
              <SortableHeader label="Position" col="position" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />
              <SortableHeader label="Type" col="jobType" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />

              <th className="p-3">Salary</th>

              <SortableHeader label="Arrangement" col="workMode" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />
              <SortableHeader label="Status" col="status" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />
              <SortableHeader label="Applied" col="dateApplied" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />
              <SortableHeader label="Updated" col="updatedAt" sortBy={sortBy} sortDir={sortDir} isDefaultSort={isDefaultSort} onSort={onSort} />

              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={10}>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">No applications to show</div>
                    <div className="text-sm text-muted-foreground">
                      Add an application above to get started.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((app) => (
                <tr
                  key={app.id}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/40 even:bg-muted/20",
                    busyId === app.id && "opacity-60"
                  )}
                >
                  <td className="p-3 w-[40px] text-center">{app.isFavorite ? "★" : ""}</td>
                  <td className="p-3">{app.company}</td>
                  <td className="p-3">{app.position}</td>
                  <td className="p-3">{jobTypeLabel(app.jobType)}</td>
                  <td className="p-3">{app.salaryText ?? "—"}</td>
                  <td className="p-3">{workModeLabel(app.workMode)}</td>

                  <td className="p-3">
                    {/* Status select: MVP inline update */}
                    <Select
                      className="h-8 w-[140px] px-2"
                      value={app.status}
                      disabled={busyId === app.id}
                      onChange={(e) =>
                        handleStatusChange(app.id, e.target.value as ApplicationStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </td>

                  <td className="p-3 text-muted-foreground">
                    {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : "N/A"}
                  </td>

                  <td className="p-3 text-muted-foreground">
                    {new Date(app.updatedAt).toLocaleDateString()}
                  </td>

                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === app.id}
                      onClick={() => handleDelete(app.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
