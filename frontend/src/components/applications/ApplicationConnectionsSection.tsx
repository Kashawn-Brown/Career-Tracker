"use client";

import { useEffect, useState } from "react";
import { Link2, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";

import type { ApplicationConnection } from "@/types/api";

// ApplicationConnectionsSection: a section for displaying and managing the connections attached to an application.

export function ApplicationConnectionsSection({
  applicationId,
  open,
  isEditing,
  onConnectionsChanged,
}: {
  applicationId: string;
  open: boolean;
  isEditing: boolean;
  onConnectionsChanged?: (applicationId: string) => void;
}) {
  // State for the connections attached to the application.
  const [connections, setConnections] = useState<ApplicationConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch attached connections whenever the drawer opens or application changes
  useEffect(() => {
    if (!open) return;
    if (!applicationId) return;

    refresh();
  }, [open, applicationId]);

  // refresh: refreshes the list of connections attached to the application.
  async function refresh() {
    setIsLoading(true);
    try {
      setErrorMessage(null);
      const res = await applicationsApi.listApplicationConnections(applicationId);
      setConnections(res.connections ?? []);
    } catch (err) {
      setConnections([]);
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  }

  // onDetach: removes a connection from the application.
  async function onDetach(connectionId: string, name: string) {
    const ok = window.confirm(`Remove "${name}" as a connection on this application?`);
    if (!ok) return;

    try {
      setErrorMessage(null);
      await applicationsApi.removeConnectionFromApplication(applicationId, connectionId);
      await refresh();
      onConnectionsChanged?.(applicationId);
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to remove connection.");
    }
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-md border px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-md border">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">People</div>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${connections.length} connection(s)`}
          </div>
        </div>

        {connections.length === 0 && !isLoading ? (
          <div className="p-3 text-sm text-muted-foreground">
            No connections attached to this application yet.
          </div>
        ) : (
          <div className="divide-y">
            {connections.map((c) => {

              const titleLine = [c.title, c.company].filter(Boolean).join(" • ");
              const metaLine = [c.relationship, c.location].filter(Boolean).join(" • ");

              return (
                <div
                  key={c.id}
                  className="px-3 py-2 flex items-center gap-3 hover:bg-muted/40"
                >
                  <UserRound className="h-4 w-4 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{c.name}</div>

                    {titleLine ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {titleLine}
                      </div>
                    ) : null}

                    {metaLine ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {metaLine}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    {c.linkedInUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open LinkedIn"
                        onClick={() => window.open(c.linkedInUrl!, "_blank", "noopener,noreferrer")}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    ) : null}

                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove from application"
                        onClick={() => onDetach(c.id, c.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Will add: search + attach existing + create inline */}
    </div>
  );
}
