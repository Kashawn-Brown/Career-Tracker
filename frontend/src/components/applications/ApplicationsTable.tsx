"use client";

import { useState } from "react";
import type { Application, ApplicationStatus, JobType, WorkMode } from "@/types/api";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "../ui/alert";

// Helper functions to format job type and work mode
function formatJobType(v: JobType) {
  switch (v) {
    case "FULL_TIME":
      return "Full-time";
    case "PART_TIME":
      return "Part-time";
    case "CONTRACT":
      return "Contract";
    case "INTERNSHIP":
      return "Internship";
    default:
      return "—";
  }
}
function formatWorkMode(v: WorkMode) {
  switch (v) {
    case "REMOTE":
      return "Remote";
    case "HYBRID":
      return "Hybrid";
    case "ONSITE":
      return "On-site";
    default:
      return "—";
  }
}

// ApplicationsTable: read-only list + MVP row actions (update status + delete).
export function ApplicationsTable({
  items,      // the list of applications to display
  onChanged,  // a callback to tell the parent: "Something changed, refetch" (update/delete)
}: {
  items: Application[];
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

  // Status options list
  const statusOptions: ApplicationStatus[] = [
    "APPLIED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
    "WISHLIST"
  ];

  return (
    <div className="space-y-2">
      {rowError ? ( <Alert variant="destructive" className="py-2">{rowError}</Alert> ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 w-[40px] text-center" title="Starred">★</th>
              <th className="p-3">Company</th>
              <th className="p-3">Position</th>
              <th className="p-3">Type</th>
              <th className="p-3">Salary</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={9}>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">No applications yet</div>
                    <div className="text-sm text-muted-foreground">
                      Add your first application above to get started.
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
                  <td className="p-3">{app.isFavorite ? "★" : ""}</td>
                  <td className="p-3">{app.company}</td>
                  <td className="p-3">{app.position}</td>
                  <td className="p-3">{formatJobType(app.jobType)}</td>
                  <td className="p-3">{app.salaryText ?? "—"}</td>
                  <td className="p-3">{formatWorkMode(app.workMode)}</td>

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
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
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
