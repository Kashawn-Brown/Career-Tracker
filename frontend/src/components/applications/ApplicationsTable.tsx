"use client";

import { useState } from "react";
import type { Application, ApplicationStatus } from "@/types/api";
import { applicationsApi } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

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
    "WISHLIST",
    "APPLIED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ];

  return (
    <div className="space-y-3">
      {rowError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {rowError}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              items.map((app, idx) => (
                <tr
                  key={app.id}
                  className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-muted/30"} transition-colors hover:bg-muted/50`}
                >
                  <td className="px-4 py-3 font-semibold text-foreground">{app.company}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{app.position}</td>

                  <td className="px-4 py-3">
                    {/* Status select: MVP inline update */}
                    <select
                      className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      value={app.status}
                      disabled={busyId === app.id}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.updatedAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/5"
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
