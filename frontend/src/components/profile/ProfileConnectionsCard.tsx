"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { connectionsApi } from "@/lib/api/connections";

import type { Connection, ConnectionSortBy, ConnectionSortDir } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProfileConnectionsCard() {
  // Preview (small list on the Profile page)
  const [preview, setPreview] = useState<Connection[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // View-all dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState<Connection[]>([]);
  const [total, setTotal] = useState(0);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Sorting (default alpha)
  const [sortBy, setSortBy] = useState<ConnectionSortBy>("name");
  const [sortDir, setSortDir] = useState<ConnectionSortDir>("asc");

  async function loadPreview() {
    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await connectionsApi.listConnections({
        page: 1,
        pageSize: 5,
        sortBy: "name",
        sortDir: "asc",
      });

      setPreview(res.items ?? []);
    } catch (err) {
      setPreview([]);
      if (err instanceof ApiError) setPreviewError(err.message);
      else setPreviewError("Failed to load connections preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function loadAll() {
    setIsListLoading(true);
    setListError(null);

    try {
      const res = await connectionsApi.listConnections({
        page: 1,
        pageSize: 200, // backend caps at 200 (connections.schemas.ts)
        sortBy,
        sortDir,
      });

      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);
      if (err instanceof ApiError) setListError(err.message);
      else setListError("Failed to load connections.");
    } finally {
      setIsListLoading(false);
    }
  }

  // Load preview once on mount
  useEffect(() => {
    loadPreview();
  }, []);

  // Load full list when dialog opens OR sort changes while open
  useEffect(() => {
    if (!isDialogOpen) return;
    loadAll();
  }, [isDialogOpen, sortBy, sortDir]);

  function handleDialogOpenChange(next: boolean) {
    setIsDialogOpen(next);

    if (!next) {
      // Keep it simple: when you close, we just clear list errors.
      setListError(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
        <CardDescription>
          People you’ve met (recruiters, referrals, interviewers, etc.).
        </CardDescription>

        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            View all connections
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {previewError ? (
          <div className="rounded-md border px-3 py-2 text-sm text-destructive">
            {previewError}
          </div>
        ) : null}

        {isPreviewLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : preview.length === 0 ? (
          <div className="text-muted-foreground">No connections yet.</div>
        ) : (
          <div className="space-y-1">
            {preview.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4">
                <span className="truncate font-medium">{c.name}</span>
                <span className="truncate text-muted-foreground">
                  {c.company ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* View-all dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>All connections</DialogTitle>
              <DialogDescription>
                Sorted alphabetically by default. Use the controls to change ordering.
              </DialogDescription>
            </DialogHeader>

            {/* Sort controls */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Sort by</div>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ConnectionSortBy)}
                  >
                    <option value="name">Name</option>
                    <option value="company">Company</option>
                    <option value="title">Title</option>
                    <option value="relationship">Relationship</option>
                    <option value="location">Location</option>
                    <option value="updatedAt">Updated</option>
                    <option value="createdAt">Created</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Direction</div>
                  <Select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as ConnectionSortDir)}
                  >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {isListLoading ? "Loading..." : `${total} total`}
              </div>
            </div>

            {listError ? (
              <div className="mt-4 rounded-md border px-3 py-2 text-sm text-destructive">
                {listError}
              </div>
            ) : null}

            {/* List */}
            <div className="mt-4 rounded-md border">
              {isListLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Loading connections...</div>
              ) : items.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No connections found.</div>
              ) : (
                <div className="divide-y">
                  {items.map((c) => {
                    const subtitle = [c.title, c.company].filter(Boolean).join(" • ");
                    return (
                      <div key={c.id} className="px-3 py-2">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        {subtitle ? (
                          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {total > 200 ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Showing first 200 results (backend limit). TODO: add paging later if needed.
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
