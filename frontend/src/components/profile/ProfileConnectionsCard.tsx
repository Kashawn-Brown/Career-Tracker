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

  // Details (right pane)
  const [detailsMode, setDetailsMode] = useState<"view" | "edit">("view");
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // The selected connection.
  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  );

  // Ensures a selection is made.
  function ensureSelection(nextItems: Connection[]) {
    if (nextItems.length === 0) {
      setSelectedId(null);
      return;
    }

    // Keep selection if it still exists; otherwise pick the first item.
    const stillExists = selectedId && nextItems.some((c) => c.id === selectedId);
    if (!stillExists) setSelectedId(nextItems[0].id);
  }

  // Loads the preview of connections.
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

  // Loads all connections.
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

  // Handles the dialog open/close.
  function handleDialogOpenChange(next: boolean) {
    setIsDialogOpen(next);

    if (!next) {
      // Reset list-only transient UI on close.
      setListError(null);
      setIsListLoading(false);
    }
  }

  // Subtitle for a connection.
  function subtitle(c: Connection) {
    return [c.title, c.company].filter(Boolean).join(" • ");
  }

  // Edit draft state
  const [editDraft, setEditDraft] = useState({
    name: "",
    company: "",
    title: "",
    email: "",
    phone: "",
    relationship: "",
    location: "",
    linkedInUrl: "",
    notes: "",
  });
  
  // Converts a Connection to an edit draft.
  function toDraft(c: Connection) {
    return {
      name: c.name ?? "",
      company: c.company ?? "",
      title: c.title ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      relationship: c.relationship ?? "",
      location: c.location ?? "",
      linkedInUrl: c.linkedInUrl ?? "",
      notes: c.notes ?? "",
    };
  }

  // Keep the edit draft in sync with the selected connection.
  useEffect(() => {
    if (!selected) {
      setDetailsMode("view");
      setEditError(null);
      return;
    }
  
    setDetailsMode("view");
    setEditError(null);
    setEditDraft(toDraft(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Starts the edit mode.
  function startDetailsEdit() {
    if (!selected) return;
    setEditError(null);
    setDetailsMode("edit");
  }
  
  // Cancels the edit mode.
  function cancelDetailsEdit() {
    if (!selected) return;
    setEditError(null);
    setEditDraft(toDraft(selected)); // revert draft back to last loaded selection
    setDetailsMode("view");
  }
  
  // Saves the changes to the connection.
  async function handleSaveDetails() {
    if (!selected) return;
  
    if (!editDraft.name.trim()) {
      setEditError("Name is required.");
      return;
    }
  
    setIsEditSaving(true);
    setEditError(null);
  
    try {
      const payload = {
        name: editDraft.name.trim(),
        company: editDraft.company.trim() || undefined,
        title: editDraft.title.trim() || undefined,
        email: editDraft.email.trim() || undefined,
        phone: editDraft.phone.trim() || undefined,
        relationship: editDraft.relationship.trim() || undefined,
        location: editDraft.location.trim() || undefined,
        linkedInUrl: editDraft.linkedInUrl.trim() || undefined,
        notes: editDraft.notes.trim() || undefined,
      };
  
      const res = await connectionsApi.updateConnection(selected.id, payload);
  
      // Refresh list + preview so alpha ordering stays correct after edits.
      await loadAll();
      await loadPreview();
  
      // Keep selection on the edited connection.
      setSelectedId(res.connection.id);
  
      setDetailsMode("view");
    } catch (err) {
      if (err instanceof ApiError) setEditError(err.message);
      else setEditError("Failed to update connection.");
    } finally {
      setIsEditSaving(false);
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
                    disabled={detailsMode === "edit" || isEditSaving}
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
                    disabled={detailsMode === "edit" || isEditSaving}
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
                            disabled={detailsMode === "edit" || isEditSaving}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted/40 disabled:opacity-60 disabled:cursor-not-allowed",
                              isSelected && "bg-muted/50",
                            )}
                            title={detailsMode === "edit" ? "Finish editing or cancel to switch." : "View details"}
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
                
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
                  <div className="text-sm font-medium">Details</div>

                  {detailsMode === "view" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startDetailsEdit}
                      disabled={!selected || isListLoading}
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={handleSaveDetails} disabled={isEditSaving}>
                        {isEditSaving ? "Saving..." : "Save"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelDetailsEdit}
                        disabled={isEditSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>


                <div className="h-[calc(55vh-41px)] overflow-auto p-4">
                  {/* Error message */}
                  {editError ? (
                    <div className="rounded-md border px-3 py-2 text-sm text-destructive">
                      {editError}
                    </div>
                  ) : null}

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
                          <Input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                            readOnly={detailsMode !== "edit"}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Company</Label>
                            <Input
                              value={editDraft.company}
                              onChange={(e) => setEditDraft((d) => ({ ...d, company: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input
                              value={editDraft.title}
                              onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                              value={editDraft.email}
                              onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Phone</Label>
                            <Input
                              value={editDraft.phone}
                              onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Relationship</Label>
                            <Input
                              value={editDraft.relationship}
                              onChange={(e) => setEditDraft((d) => ({ ...d, relationship: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Location</Label>
                            <Input
                              value={editDraft.location}
                              onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value }))}
                              readOnly={detailsMode !== "edit"}
                              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label>LinkedIn URL</Label>
                          <Input
                            value={editDraft.linkedInUrl}
                            onChange={(e) => setEditDraft((d) => ({ ...d, linkedInUrl: e.target.value }))}
                            readOnly={detailsMode !== "edit"}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={editDraft.notes}
                            onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                            readOnly={detailsMode !== "edit"}
                            className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                          />
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
