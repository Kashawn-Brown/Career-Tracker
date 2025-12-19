"use client";

import type { Application } from "@/types/api";

// ApplicationsTable: simple read-only table for the applications list (actions not implemented yet).
export function ApplicationsTable({ items }: { items: Application[] }) {
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Company</th>
            <th className="p-3">Position</th>
            <th className="p-3">Status</th>
            <th className="p-3">Updated</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td className="p-3 text-muted-foreground" colSpan={4}>
                No applications yet.
              </td>
            </tr>
          ) : (
            items.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-3">{app.company}</td>
                <td className="p-3">{app.position}</td>
                <td className="p-3">{app.status}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(app.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
