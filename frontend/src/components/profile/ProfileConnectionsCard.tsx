"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { connectionsApi } from "@/lib/api/connections";
import { cn } from "@/lib/utils";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ProfileConnectionsCard: small preview on Profile + view-all dialog (2-pane list + details).
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

  // Selection (right pane)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sorting (default alpha)
  const [sortBy, setSortBy] = useState<ConnectionSortBy>("name");
  const [sortDir, setSortDir] = useState<ConnectionSortDir>("asc");

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  );

  function ensureSelection(nextItems: Connection[]) {
    if (nextItems.length === 0) {
      setSelectedId(null);
      return;
    }

    // Keep selection if it still exists; otherwise pick the first item.
    const stillExists = selectedId && nextItems.some((c) => c.id === selectedId);
    if (!stillExists) setSelectedId(nextItems[0].id);
  }

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
        pageSize: 200, // backend caps at 200
        sortBy,
        sortDir,
      });

      const nextItems = res.items ?? [];
      setItems(nextItems);
      setTotal(res.total ?? 0);

      // Keep selection stable across sort changes/open, if possible.
      ensureSelection(nextItems);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setSelectedId(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, sortBy, sortDir]);

  function handleDialogOpenChange(next: boolean) {
    setIsDialogOpen(next);

    if (!next) {
      // Reset list-only transient UI on close.
      setListError(null);
      setIsListLoading(false);
    }
  }

  function subtitle(c: Connection) {
    return [c.title, c.company].filter(Boolean).join(" • ");
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
                <span className="truncate text-muted-foreground">{c.company ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* View-all dialog (2-pane) */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>All connections</DialogTitle>
              <DialogDescription>
                Click a person on the left to view details on the right.
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
            </div>

            {listError ? (
              <div className="mt-4 rounded-md border px-3 py-2 text-sm text-destructive">
                {listError}
              </div>
            ) : null}

            {/* 2-pane layout */}
            <div className="mt-4 grid gap-4 md:grid-cols-[320px_1fr] h-[55vh]">
              {/* Left list */}
              <div className="rounded-md border overflow-hidden">
                <div className="px-3 py-2 border-b text-sm font-medium">
                  Connections
                  <div className="text-xs text-muted-foreground float-right">
                    {isListLoading ? "Loading..." : `${total} total`}
                  </div>
                </div>

                <div className="h-[calc(55vh-41px)] overflow-auto">
                  {isListLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Loading connections...
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No connections found.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {items.map((c) => {
                        const isSelected = c.id === selectedId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted/40",
                              isSelected && "bg-muted/50"
                            )}
                            title="View details"
                          >
                            <div className="truncate text-sm font-medium">{c.name}</div>
                            {subtitle(c) ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {subtitle(c)}
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right details */}
              <div className="rounded-md border overflow-hidden">
                <div className="px-3 py-2 border-b text-sm font-medium">
                  Details
                </div>

                <div className="h-[calc(55vh-41px)] overflow-auto p-4">
                  {!selected ? (
                    <div className="text-sm text-muted-foreground">
                      Select a connection from the left to view details.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-base font-semibold">{selected.name}</div>
                        {subtitle(selected) ? (
                          <div className="text-sm text-muted-foreground">
                            {subtitle(selected)}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input readOnly value={selected.name} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Company</Label>
                            <Input readOnly value={selected.company ?? ""} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input readOnly value={selected.title ?? ""} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input readOnly value={selected.email ?? ""} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Phone</Label>
                            <Input readOnly value={selected.phone ?? ""} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Relationship</Label>
                            <Input readOnly value={selected.relationship ?? ""} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Location</Label>
                            <Input readOnly value={selected.location ?? ""} />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label>LinkedIn URL</Label>
                          <Input readOnly value={selected.linkedInUrl ?? ""} />
                        </div>

                        <div className="grid gap-2">
                          <Label>Notes</Label>
                          <Textarea readOnly value={selected.notes ?? ""} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
