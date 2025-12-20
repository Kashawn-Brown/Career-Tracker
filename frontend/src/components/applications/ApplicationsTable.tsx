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
    <div className="space-y-2">
      {rowError ? <div className="text-sm text-red-600">{rowError}</div> : null}

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Company</th>
              <th className="p-3">Position</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              items.map((app) => (
                <tr key={app.id} className="border-t">
                  <td className="p-3">{app.company}</td>
                  <td className="p-3">{app.position}</td>

                  <td className="p-3">
                    {/* Status select: MVP inline update */}
                    <select
                      className="border rounded px-2 py-1"
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
